"""
sqlalchemy_to_marshmallow is modified from https://marshmallow-sqlalchemy.readthedocs.io/en/latest/recipes.html#automatically-generating-schemas-for-sqlalchemy-models
"""
import sys
import warnings
from collections.abc import Container, Generator
from functools import reduce
from inspect import get_annotations, signature
from operator import or_
from types import EllipsisType, ModuleType, UnionType
from typing import ForwardRef, TypeAlias, get_args, get_origin

from marshmallow_sqlalchemy import ModelConversionError, SQLAlchemyAutoSchema
from pydantic import BaseModel, ConfigDict, create_model
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import DeclarativeBase, Mapped, Session
from sqlalchemy.orm.clsregistry import ClsRegistryToken, _ModuleMarker

PydanticFieldDecl: TypeAlias = tuple[type | UnionType | ForwardRef | None, EllipsisType | None]

SYNTH_MODULE = "_boh_app_synth"


def setup_schema(decl_base: type[DeclarativeBase], *, session: Session) -> None:
    mod = sys.modules[SYNTH_MODULE] = ModuleType(SYNTH_MODULE)

    classes = []
    for class_ in decl_base.registry._class_registry.values():
        if isinstance(class_, ClsRegistryToken):
            if not isinstance(class_, _ModuleMarker):
                warnings.warn(f"setup_schema does not work with ClsRegistryToken {class_}", stacklevel=2)
            continue
        assert issubclass(class_, DeclarativeBase), class_.mro()
        classes.append(class_)

    for class_ in classes:
        pydantic_model = sqlalchemy_to_pydantic(class_, flat=True)
        setattr(mod, pydantic_model.__name__, pydantic_model)

    for class_ in classes:
        class_.__marshmallow__ = sqlalchemy_to_marshmallow(class_, session=session)
        class_.__pydantic__ = sqlalchemy_to_pydantic(class_)
        setattr(mod, class_.__pydantic__.__name__, class_.__pydantic__)


def sqlalchemy_to_marshmallow(class_: type[DeclarativeBase], *, session: Session) -> type[SQLAlchemyAutoSchema]:
    if class_.__name__.endswith("Schema"):
        raise ModelConversionError("For safety, setup_schema can not be used when a Model class ends with 'Schema'")

    class Meta:
        model = class_
        sqla_session = session
        include_relationships = True
        load_instance = True
        # include_fk = True # seems to override include_relationships

    schema_class_name = f"{class_.__name__}Schema"

    # default fields defined by model.mapper.attrs:
    # https://docs.sqlalchemy.org/en/20/orm/mapping_api.html#sqlalchemy.orm.Mapper.attrs
    # TODO: make it work loop order independent
    additional_fields = getattr(class_, "_additional_fields", lambda: {})()
    schema_class = type(schema_class_name, (SQLAlchemyAutoSchema,), {"Meta": Meta, **additional_fields})

    return schema_class


orm_config = ConfigDict(from_attributes=True)


def sqlalchemy_to_pydantic(
    db_model: type[DeclarativeBase], *, config: ConfigDict = orm_config, exclude: Container[str] = (), flat: bool = False
) -> type[BaseModel]:
    simple_fields = dict(convert_simple_fields(db_model, exclude=exclude))
    if flat:
        fields = simple_fields
        name = f"{db_model.__name__}FlatModel"
    else:
        rel_fields = dict(convert_relationships(db_model, exclude=exclude))
        prop_fields = dict(convert_hybrid_properties(db_model, exclude=exclude))
        fields = simple_fields | rel_fields | prop_fields
        name = f"{db_model.__name__}Model"

    pydantic_model = create_model(name, __config__=config, **fields)
    return pydantic_model


def convert_simple_fields(
    db_model: type[DeclarativeBase], *, exclude: Container[str] = ()
) -> Generator[tuple[str, PydanticFieldDecl], None, None]:
    for name, column in db_model.__table__.columns.items():
        if name in exclude:
            continue
        if column.foreign_keys:
            continue  # skip foreign_id fields
        python_type = column.type.python_type
        if not column.nullable:
            yield name, (python_type, ...)
        else:
            yield name, (python_type | None, None)


def convert_relationships(
    db_model: type[DeclarativeBase], *, exclude: Container[str] = ()
) -> Generator[tuple[str, PydanticFieldDecl], None, None]:
    model_annotations = get_annotations(db_model, eval_str=True)
    for name, mapping in model_annotations.items():
        column = db_model.__table__.columns.get(name)
        if name in exclude:
            continue
        if get_origin(mapping) is not Mapped:
            continue  # skip ClassVars and the like
        if column is not None:
            if not column.foreign_keys:
                continue
            if column.type.python_type in {int, str}:
                continue  # skip foreign_id fields
        [sqla_type] = get_args(mapping)
        python_type, is_nullable = get_python_type(sqla_type)
        yield name, (python_type, None if is_nullable else ...)


def convert_hybrid_properties(
    db_model: type[DeclarativeBase], *, exclude: Container[str] = ()
) -> Generator[tuple[str, PydanticFieldDecl], None, None]:
    for name, field in vars(db_model).items():
        if name in exclude:
            continue
        if not isinstance(field, hybrid_property):
            continue
        sqla_type: type | UnionType = signature(field.fget, eval_str=True).return_annotation
        python_type, is_nullable = get_python_type(sqla_type)
        yield name, (python_type, None if is_nullable else ...)


def get_python_type(sqla_type: type | UnionType | None):
    is_nullable = False
    if sqla_types_inner := get_args(sqla_type):
        if None in sqla_types_inner:
            is_nullable = True
        python_types_inner = [get_python_type_inner(t) for t in sqla_types_inner]
        return list[reduce(or_, python_types_inner)], is_nullable
    else:
        return get_python_type_inner(sqla_type), is_nullable


def get_python_type_inner(sqla_type: type | None) -> ForwardRef | None:
    if sqla_type in (None, type(None)) or issubclass(sqla_type, str | int):
        return None
    return ForwardRef(f"{sqla_type.__name__}FlatModel", module=SYNTH_MODULE)
