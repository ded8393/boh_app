"""
sqlalchemy_to_marshmallow is modified from https://marshmallow-sqlalchemy.readthedocs.io/en/latest/recipes.html#automatically-generating-schemas-for-sqlalchemy-models
"""
import warnings
from collections.abc import Container, Generator
from functools import reduce
from inspect import get_annotations
from operator import or_
from types import EllipsisType
from typing import ForwardRef, get_args, get_origin

from marshmallow_sqlalchemy import ModelConversionError, SQLAlchemyAutoSchema
from pydantic import BaseModel, ConfigDict, create_model
from sqlalchemy import Table
from sqlalchemy.orm import DeclarativeBase, Mapped, Session
from sqlalchemy.orm.clsregistry import ClsRegistryToken, _ModuleMarker


def setup_schema(decl_base: type[DeclarativeBase], *, session: Session) -> None:
    for class_ in decl_base.registry._class_registry.values():
        if isinstance(class_, ClsRegistryToken):
            if not isinstance(class_, _ModuleMarker):
                warnings.warn(f"setup_schema does not work with ClsRegistryToken {class_}", stacklevel=2)
            continue
        assert issubclass(class_, DeclarativeBase), class_.mro()

        class_.__marshmallow__ = sqlalchemy_to_marshmallow(class_, session=session)
        class_.__pydantic__ = sqlalchemy_to_pydantic(class_)


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
    db_model: type[DeclarativeBase],
    *,
    config: ConfigDict = orm_config,
    exclude: Container[str] = (),
) -> type[BaseModel]:
    table = db_model.metadata.tables[db_model.__tablename__]

    fields = dict(convert_simple_fields(table, exclude=exclude))
    fields |= dict(convert_relationships(db_model, exclude=exclude))

    pydantic_model = create_model(db_model.__name__, __config__=config, **fields)
    return pydantic_model


def convert_simple_fields(
    table: Table, *, exclude: Container[str] = ()
) -> Generator[tuple[str, tuple[type | None, EllipsisType | None]], None, None]:
    for column in table.columns:
        name = column.name
        if name in exclude:
            continue
        python_type: type | None = None
        if hasattr(column.type, "impl"):
            if hasattr(column.type.impl, "python_type"):
                python_type = column.type.impl.python_type
        elif hasattr(column.type, "python_type"):
            python_type = column.type.python_type
        assert python_type, f"Could not infer python_type for {column}"

        if not column.nullable:
            yield name, (python_type, ...)
        else:
            yield name, (python_type | None, None)


def convert_relationships(
    db_model: type[DeclarativeBase], *, exclude: Container[str] = ()
) -> Generator[tuple[str, tuple[type | None, EllipsisType | None]], None, None]:
    model_annotations = get_annotations(db_model, eval_str=True)
    for name, mapping in model_annotations.items():
        if name in exclude:
            continue
        if get_origin(mapping) is not Mapped:
            continue
        is_nullable = False
        [sqla_type] = get_args(mapping)
        if sqla_types_inner := get_args(sqla_type):
            if None in sqla_types_inner:
                is_nullable = True
            python_types_inner = [get_python_type(t) for t in sqla_types_inner]
            python_type = list[reduce(or_, python_types_inner)]
        else:
            python_type = get_python_type(sqla_type)
        yield name, (python_type, None if is_nullable else ...)


def get_python_type(sqla_typ: type | None) -> ForwardRef | None:
    if sqla_typ is None:
        return None
    return ForwardRef(f"'{sqla_typ.__module__}.{sqla_typ.__name__}.__pydantic__'")
