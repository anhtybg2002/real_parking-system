from pydantic import BaseModel, RootModel
from typing import List


class VehicleTypeBase(BaseModel):
    key: str
    label: str
    enabled: bool = True
    # allow icons to be a string (unicode / name / url), an object, or null
    icons: str | dict | None = None


class VehicleTypeOut(VehicleTypeBase):
    id: int
    icons: str | dict | None = None


class VehicleTypeList(RootModel[List[VehicleTypeBase]]):
    root: List[VehicleTypeBase]
