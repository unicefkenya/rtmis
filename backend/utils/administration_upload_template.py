import os
from typing import List
from django.db.models import QuerySet
from django.utils import timezone

import pandas as pd
from api.v1.v1_profile.models import Levels, AdministrationAttribute

from api.v1.v1_users.models import SystemUser


def generate_excel(user: SystemUser, attributes: List[int] = []):
    directory = 'tmp/administrations-template'
    os.makedirs(directory, exist_ok=True)
    filename = (
            f"{timezone.now().strftime('%Y%m%d%H%M%S')}-{user.pk}-"
            "administrations-template.xlsx")
    filepath = f"./{directory}/{filename}"
    if os.path.exists(filepath):
        os.remove(filepath)
    generate_template(filepath, attributes)
    return filepath


def generate_template(filepath, attributes: List[int] = []):
    level_headers = [
            f'{lvl.id}|{lvl.name}' for lvl
            in Levels.objects.order_by('level').all()]
    attribute_headers = generate_attribute_headers(
        AdministrationAttribute.objects.filter(
            id__in=attributes).order_by('id'))
    columns = level_headers + attribute_headers
    data = pd.DataFrame(columns=columns, index=[0])
    writer = pd.ExcelWriter(filepath, engine='xlsxwriter')
    data.to_excel(
            writer,
            sheet_name='data',
            startrow=1,
            header=False,
            index=False)
    workbook = writer.book
    worksheet = writer.sheets['data']
    header_format = workbook.add_format({
        'bold': True,
        'text_wrap': True,
        'valign': 'top',
        'border': 1
    })
    for col_num, value in enumerate(data.columns.values):
        worksheet.write(0, col_num, value, header_format)
    writer.save()


def generate_attribute_headers(
        attributes: QuerySet[AdministrationAttribute]) -> List[str]:
    headers = []
    for attribute in attributes:
        if attribute.type == AdministrationAttribute.Type.AGGREGATE:
            headers = headers + generate_aggregate_attribute_headers(attribute)
        else:
            headers.append(f'{attribute.id}|{attribute.name}')
    return headers


def generate_aggregate_attribute_headers(
        attribute: AdministrationAttribute) -> List[str]:
    return [
        f'{attribute.id}|{attribute.name}|{opt}'
        for opt in attribute.options
    ]