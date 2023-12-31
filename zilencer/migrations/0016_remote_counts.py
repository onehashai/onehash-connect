# Generated by Django 1.11.18 on 2019-02-02 06:02

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("zilencer", "0015_delete_billing"),
    ]

    operations = [
        migrations.CreateModel(
            name="RemoteInstallationCount",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("property", models.CharField(max_length=32)),
                ("subgroup", models.CharField(max_length=16, null=True)),
                ("end_time", models.DateTimeField()),
                ("value", models.BigIntegerField()),
                ("remote_id", models.IntegerField(db_index=True)),
                (
                    "server",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="zilencer.RemoteZulipServer"
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="RemoteRealmCount",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("property", models.CharField(max_length=32)),
                ("subgroup", models.CharField(max_length=16, null=True)),
                ("end_time", models.DateTimeField()),
                ("value", models.BigIntegerField()),
                ("realm_id", models.IntegerField(db_index=True)),
                ("remote_id", models.IntegerField(db_index=True)),
                (
                    "server",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="zilencer.RemoteZulipServer"
                    ),
                ),
            ],
        ),
        migrations.AlterUniqueTogether(
            name="remoterealmcount",
            unique_together={("server", "realm_id", "property", "subgroup", "end_time")},
        ),
        migrations.AddIndex(
            model_name="remoterealmcount",
            index=models.Index(
                fields=["property", "end_time"],
                name="zilencer_remoterealmcount_property_end_time_506a0b38_idx",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="remoteinstallationcount",
            unique_together={("server", "property", "subgroup", "end_time")},
        ),
    ]
