# Generated by Django 4.2.1 on 2023-06-06 08:26

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("zerver", "0470_set_default_value_for_create_multiuse_invite_group"),
    ]

    operations = [
        migrations.AlterField(
            model_name="realm",
            name="create_multiuse_invite_group",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="+",
                to="zerver.usergroup",
            ),
        ),
    ]
