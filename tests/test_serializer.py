import pytest

from boh_app import models


def test_rest_serializer(client):
    result = client.get("assistant")
    assert result.status_code == 200
    assistants = {a["id"]: a for a in result.json()}
    asp_names = {asp.get("id") for asp in assistants["Consulting Engineer"]["accepted_aspects"]}
    assert asp_names == {*models.Assistant.base_aspects, "fuel"}


@pytest.mark.parametrize("model", models.get_tablename_model_mapping().values())
def test_pydantic_v_marshmallow(model):
    marshmallow = model.__marshmallow__()
    pydantic = model.__pydantic__
    assert set(marshmallow.declared_fields.keys()) == set(pydantic.model_fields.keys())
