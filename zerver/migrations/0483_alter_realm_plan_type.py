# Generated by Django 4.2.6 on 2023-11-21 11:57

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("zerver", "0482_alter_realm_plan_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="realm",
            name="plan_type",
            field=models.PositiveSmallIntegerField(default=2),
        ),
    ]
