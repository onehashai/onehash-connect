# Generated by Django 4.2.6 on 2023-11-12 19:21

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("zerver", "0481_alter_realm_uuid_alter_realm_uuid_owner_secret"),
        ("contenttypes", "0002_remove_content_type_name"),
        ("zilencer", "0029_update_remoterealm_indexes"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OneHashCustomer",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("stripe_customer_id", models.CharField(max_length=255, null=True, unique=True)),
                ("sponsorship_pending", models.BooleanField(default=False)),
                (
                    "default_discount",
                    models.DecimalField(decimal_places=4, max_digits=7, null=True),
                ),
                ("exempt_from_license_number_check", models.BooleanField(default=False)),
                (
                    "realm",
                    models.OneToOneField(
                        null=True, on_delete=django.db.models.deletion.CASCADE, to="zerver.realm"
                    ),
                ),
                (
                    "remote_server",
                    models.OneToOneField(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="zilencer.remotezulipserver",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="OneHashCustomerPlan",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("automanage_licenses", models.BooleanField(default=False)),
                ("charge_automatically", models.BooleanField(default=False)),
                ("price_per_license", models.IntegerField(null=True)),
                ("fixed_price", models.IntegerField(null=True)),
                ("discount", models.DecimalField(decimal_places=4, max_digits=6, null=True)),
                ("billing_cycle_anchor", models.DateTimeField()),
                ("billing_schedule", models.SmallIntegerField()),
                ("next_invoice_date", models.DateTimeField(db_index=True, null=True)),
                ("end_date", models.DateTimeField(null=True)),
                ("invoicing_status", models.SmallIntegerField(default=1)),
                ("tier", models.SmallIntegerField()),
                ("status", models.SmallIntegerField(default=1)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="onehash_billing.onehashcustomer",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="OneHashPaymentIntent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("stripe_payment_intent_id", models.CharField(max_length=255, unique=True)),
                ("status", models.SmallIntegerField()),
                ("last_payment_error", models.JSONField(default=None, null=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="onehash_billing.onehashcustomer",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="OneHashSession",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("stripe_session_id", models.CharField(max_length=255, unique=True)),
                ("type", models.SmallIntegerField()),
                ("status", models.SmallIntegerField(default=1)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="onehash_billing.onehashcustomer",
                    ),
                ),
                (
                    "payment_intent",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="onehash_billing.onehashpaymentintent",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="OneHashLicenseLedger",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("is_renewal", models.BooleanField(default=False)),
                ("event_time", models.DateTimeField()),
                ("licenses", models.IntegerField()),
                ("licenses_at_next_renewal", models.IntegerField(null=True)),
                (
                    "plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="onehash_billing.onehashcustomerplan",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="OneHashEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("stripe_event_id", models.CharField(max_length=255)),
                ("type", models.CharField(max_length=255)),
                ("status", models.SmallIntegerField(default=1)),
                ("object_id", models.PositiveIntegerField(db_index=True)),
                ("handler_error", models.JSONField(default=None, null=True)),
                (
                    "content_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="contenttypes.contenttype"
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="onehashcustomerplan",
            name="invoiced_through",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="+",
                to="onehash_billing.onehashlicenseledger",
            ),
        ),
        migrations.CreateModel(
            name="ConnectSponsorshipRequest",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "org_type",
                    models.PositiveSmallIntegerField(
                        choices=[
                            (0, "Unspecified"),
                            (10, "Business"),
                            (20, "Open-source project"),
                            (30, "Education (non-profit)"),
                            (35, "Education (for-profit)"),
                            (40, "Research"),
                            (50, "Event or conference"),
                            (60, "Non-profit (registered)"),
                            (70, "Government"),
                            (80, "Political group"),
                            (90, "Community"),
                            (100, "Personal"),
                            (1000, "Other"),
                        ],
                        default=0,
                    ),
                ),
                ("org_website", models.URLField(blank=True, null=True)),
                ("org_description", models.TextField(default="")),
                (
                    "realm",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="zerver.realm"
                    ),
                ),
                (
                    "requested_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="onehashcustomer",
            constraint=models.CheckConstraint(
                check=models.Q(
                    ("realm__isnull", False), ("remote_server__isnull", False), _connector="XOR"
                ),
                name="onehash_billing_xor_self_hosted",
            ),
        ),
    ]
