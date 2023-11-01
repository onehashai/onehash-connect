import tempfile
from datetime import datetime, timedelta, timezone
from typing import Dict
from unittest.mock import patch

import ldap
import orjson
from django.core import mail
from django.core.mail.message import EmailMultiAlternatives
from django.test import override_settings
from django.utils.timezone import now as timezone_now
from django_auth_ldap.config import LDAPSearch

from zerver.actions.users import do_change_user_role
from zerver.lib.email_notifications import (
    enqueue_welcome_emails,
    get_onboarding_email_schedule,
    send_account_registered_email,
)
from zerver.lib.send_email import deliver_scheduled_emails, send_custom_email
from zerver.lib.test_classes import ZulipTestCase
from zerver.models import Realm, ScheduledEmail, UserProfile, get_realm


class TestCustomEmails(ZulipTestCase):
    def test_send_custom_email_argument(self) -> None:
        hamlet = self.example_user("hamlet")
        email_subject = "subject_test"
        reply_to = "reply_to_test"
        from_name = "from_name_test"

        with tempfile.NamedTemporaryFile() as markdown_template:
            markdown_template.write(b"# Some heading\n\nSome content\n{{ realm_name }}")
            markdown_template.flush()
            send_custom_email(
                UserProfile.objects.filter(id=hamlet.id),
                options={
                    "markdown_template_path": markdown_template.name,
                    "reply_to": reply_to,
                    "subject": email_subject,
                    "from_name": from_name,
                    "dry_run": False,
                },
            )
        self.assert_length(mail.outbox, 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.subject, email_subject)
        self.assert_length(msg.reply_to, 1)
        self.assertEqual(msg.reply_to[0], reply_to)
        self.assertNotIn("{% block content %}", msg.body)
        self.assertIn("# Some heading", msg.body)
        self.assertIn("Zulip Dev", msg.body)
        self.assertNotIn("{{ realm_name }}", msg.body)
        self.assertNotIn("</div>", msg.body)

        assert isinstance(msg, EmailMultiAlternatives)
        self.assertIn("Some heading</h1>", str(msg.alternatives[0][0]))
        self.assertNotIn("{{ realm_name }}", str(msg.alternatives[0][0]))

    def test_send_custom_email_remote_server(self) -> None:
        email_subject = "subject_test"
        reply_to = "reply_to_test"
        from_name = "from_name_test"
        contact_email = "zulip-admin@example.com"
        markdown_template_path = "templates/corporate/policies/index.md"
        send_custom_email(
            UserProfile.objects.none(),
            target_emails=[contact_email],
            options={
                "markdown_template_path": markdown_template_path,
                "reply_to": reply_to,
                "subject": email_subject,
                "from_name": from_name,
                "dry_run": False,
            },
        )
        self.assert_length(mail.outbox, 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.subject, email_subject)
        self.assertEqual(msg.to, [contact_email])
        self.assert_length(msg.reply_to, 1)
        self.assertEqual(msg.reply_to[0], reply_to)
        self.assertNotIn("{% block content %}", msg.body)
        # Verify that the HTML version contains the footer.
        assert isinstance(msg, EmailMultiAlternatives)
        self.assertIn(
            "You are receiving this email to update you about important changes to Zulip",
            str(msg.alternatives[0][0]),
        )

    def test_send_custom_email_headers(self) -> None:
        hamlet = self.example_user("hamlet")
        markdown_template_path = (
            "zerver/tests/fixtures/email/custom_emails/email_base_headers_test.md"
        )
        send_custom_email(
            UserProfile.objects.filter(id=hamlet.id),
            options={
                "markdown_template_path": markdown_template_path,
                "dry_run": False,
            },
        )
        self.assert_length(mail.outbox, 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.subject, "Test subject")
        self.assertFalse(msg.reply_to)
        self.assertEqual("Test body", msg.body)

    def test_send_custom_email_context(self) -> None:
        hamlet = self.example_user("hamlet")
        markdown_template_path = (
            "zerver/tests/fixtures/email/custom_emails/email_base_headers_test.md"
        )
        send_custom_email(
            UserProfile.objects.filter(id=hamlet.id),
            options={
                "markdown_template_path": markdown_template_path,
                "dry_run": False,
            },
        )
        self.assert_length(mail.outbox, 1)
        msg = mail.outbox[0]

        # We default to not including an unsubscribe link in the headers
        self.assertEqual(msg.extra_headers.get("X-Auto-Response-Suppress"), "All")
        self.assertIsNone(msg.extra_headers.get("List-Unsubscribe"))

        mail.outbox = []
        markdown_template_path = (
            "zerver/tests/fixtures/email/custom_emails/email_base_headers_custom_test.md"
        )

        def add_context(context: Dict[str, object], user: UserProfile) -> None:
            context["unsubscribe_link"] = "some@email"
            context["custom"] = str(user.id)

        send_custom_email(
            UserProfile.objects.filter(id=hamlet.id),
            options={
                "markdown_template_path": markdown_template_path,
                "dry_run": False,
            },
            add_context=add_context,
        )
        self.assert_length(mail.outbox, 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.extra_headers.get("X-Auto-Response-Suppress"), "All")
        self.assertEqual(msg.extra_headers.get("List-Unsubscribe"), "<some@email>")
        self.assertIn(f"Test body with {hamlet.id} value", msg.body)

    def test_send_custom_email_no_argument(self) -> None:
        hamlet = self.example_user("hamlet")
        from_name = "from_name_test"
        email_subject = "subject_test"
        markdown_template_path = (
            "zerver/tests/fixtures/email/custom_emails/email_base_headers_no_headers_test.md"
        )

        from zerver.lib.send_email import NoEmailArgumentError

        self.assertRaises(
            NoEmailArgumentError,
            send_custom_email,
            UserProfile.objects.filter(id=hamlet.id),
            options={
                "markdown_template_path": markdown_template_path,
                "from_name": from_name,
                "dry_run": False,
            },
        )

        self.assertRaises(
            NoEmailArgumentError,
            send_custom_email,
            UserProfile.objects.filter(id=hamlet.id),
            options={
                "markdown_template_path": markdown_template_path,
                "subject": email_subject,
                "dry_run": False,
            },
        )

    def test_send_custom_email_doubled_arguments(self) -> None:
        hamlet = self.example_user("hamlet")
        from_name = "from_name_test"
        email_subject = "subject_test"
        markdown_template_path = (
            "zerver/tests/fixtures/email/custom_emails/email_base_headers_test.md"
        )

        from zerver.lib.send_email import DoubledEmailArgumentError

        self.assertRaises(
            DoubledEmailArgumentError,
            send_custom_email,
            UserProfile.objects.filter(id=hamlet.id),
            options={
                "markdown_template_path": markdown_template_path,
                "subject": email_subject,
                "dry_run": False,
            },
        )

        self.assertRaises(
            DoubledEmailArgumentError,
            send_custom_email,
            UserProfile.objects.filter(id=hamlet.id),
            options={
                "markdown_template_path": markdown_template_path,
                "from_name": from_name,
                "dry_run": False,
            },
        )

    def test_send_custom_email_admins_only(self) -> None:
        admin_user = self.example_user("hamlet")
        do_change_user_role(admin_user, UserProfile.ROLE_REALM_ADMINISTRATOR, acting_user=None)

        non_admin_user = self.example_user("cordelia")

        markdown_template_path = (
            "zerver/tests/fixtures/email/custom_emails/email_base_headers_test.md"
        )
        send_custom_email(
            UserProfile.objects.filter(id__in=(admin_user.id, non_admin_user.id)),
            options={
                "markdown_template_path": markdown_template_path,
                "admins_only": True,
                "dry_run": False,
            },
        )
        self.assert_length(mail.outbox, 1)
        self.assertIn(admin_user.delivery_email, mail.outbox[0].to[0])

    def test_send_custom_email_dry_run(self) -> None:
        hamlet = self.example_user("hamlet")
        email_subject = "subject_test"
        reply_to = "reply_to_test"
        from_name = "from_name_test"
        markdown_template_path = "templates/zerver/tests/markdown/test_nested_code_blocks.md"
        with patch("builtins.print") as _:
            send_custom_email(
                UserProfile.objects.filter(id=hamlet.id),
                options={
                    "markdown_template_path": markdown_template_path,
                    "reply_to": reply_to,
                    "subject": email_subject,
                    "from_name": from_name,
                    "dry_run": True,
                },
            )
            self.assert_length(mail.outbox, 0)


class TestFollowupEmails(ZulipTestCase):
    def test_account_registered_email_context(self) -> None:
        hamlet = self.example_user("hamlet")
        send_account_registered_email(hamlet)
        scheduled_emails = ScheduledEmail.objects.filter(users=hamlet).order_by(
            "scheduled_timestamp"
        )
        email_data = orjson.loads(scheduled_emails[0].data)
        self.assertEqual(email_data["context"]["email"], self.example_email("hamlet"))
        self.assertEqual(email_data["context"]["is_realm_admin"], False)
        self.assertEqual(
            email_data["context"]["getting_user_started_link"],
            "http://zulip.testserver/help/getting-started-with-zulip",
        )
        self.assertNotIn("ldap_username", email_data["context"])

        ScheduledEmail.objects.all().delete()

        iago = self.example_user("iago")
        send_account_registered_email(iago)
        scheduled_emails = ScheduledEmail.objects.filter(users=iago).order_by("scheduled_timestamp")
        email_data = orjson.loads(scheduled_emails[0].data)
        self.assertEqual(email_data["context"]["email"], self.example_email("iago"))
        self.assertEqual(email_data["context"]["is_realm_admin"], True)
        self.assertEqual(
            email_data["context"]["getting_organization_started_link"],
            "http://zulip.testserver/help/getting-your-organization-started-with-zulip",
        )
        self.assertEqual(
            email_data["context"]["getting_user_started_link"],
            "http://zulip.testserver/help/getting-started-with-zulip",
        )
        self.assertNotIn("ldap_username", email_data["context"])

    # See https://zulip.readthedocs.io/en/latest/production/authentication-methods.html#ldap-including-active-directory
    # for case details.
    @override_settings(
        AUTHENTICATION_BACKENDS=(
            "zproject.backends.ZulipLDAPAuthBackend",
            "zproject.backends.ZulipDummyBackend",
        ),
        # configure email search for email address in the uid attribute:
        AUTH_LDAP_REVERSE_EMAIL_SEARCH=LDAPSearch(
            "ou=users,dc=zulip,dc=com", ldap.SCOPE_ONELEVEL, "(uid=%(email)s)"
        ),
    )
    def test_account_registered_email_ldap_case_a_login_credentials(self) -> None:
        self.init_default_ldap_database()
        ldap_user_attr_map = {"full_name": "cn"}

        with self.settings(AUTH_LDAP_USER_ATTR_MAP=ldap_user_attr_map):
            self.login_with_return(
                "newuser_email_as_uid@zulip.com",
                self.ldap_password("newuser_email_as_uid@zulip.com"),
            )
            user = UserProfile.objects.get(delivery_email="newuser_email_as_uid@zulip.com")
            scheduled_emails = ScheduledEmail.objects.filter(users=user).order_by(
                "scheduled_timestamp"
            )

            self.assert_length(scheduled_emails, 3)
            email_data = orjson.loads(scheduled_emails[0].data)
            self.assertEqual(email_data["context"]["ldap"], True)
            self.assertEqual(
                email_data["context"]["ldap_username"], "newuser_email_as_uid@zulip.com"
            )

    @override_settings(
        AUTHENTICATION_BACKENDS=(
            "zproject.backends.ZulipLDAPAuthBackend",
            "zproject.backends.ZulipDummyBackend",
        )
    )
    def test_account_registered_email_ldap_case_b_login_credentials(self) -> None:
        self.init_default_ldap_database()
        ldap_user_attr_map = {"full_name": "cn"}

        with self.settings(
            LDAP_APPEND_DOMAIN="zulip.com",
            AUTH_LDAP_USER_ATTR_MAP=ldap_user_attr_map,
        ):
            self.login_with_return("newuser@zulip.com", self.ldap_password("newuser"))

            user = UserProfile.objects.get(delivery_email="newuser@zulip.com")
            scheduled_emails = ScheduledEmail.objects.filter(users=user).order_by(
                "scheduled_timestamp"
            )
            self.assert_length(scheduled_emails, 3)
            email_data = orjson.loads(scheduled_emails[0].data)
            self.assertEqual(email_data["context"]["ldap"], True)
            self.assertEqual(email_data["context"]["ldap_username"], "newuser")

    @override_settings(
        AUTHENTICATION_BACKENDS=(
            "zproject.backends.ZulipLDAPAuthBackend",
            "zproject.backends.ZulipDummyBackend",
        )
    )
    def test_account_registered_email_ldap_case_c_login_credentials(self) -> None:
        self.init_default_ldap_database()
        ldap_user_attr_map = {"full_name": "cn"}

        with self.settings(
            LDAP_EMAIL_ATTR="mail",
            AUTH_LDAP_USER_ATTR_MAP=ldap_user_attr_map,
        ):
            self.login_with_return("newuser_with_email", self.ldap_password("newuser_with_email"))
            user = UserProfile.objects.get(delivery_email="newuser_email@zulip.com")
            scheduled_emails = ScheduledEmail.objects.filter(users=user).order_by(
                "scheduled_timestamp"
            )
            self.assert_length(scheduled_emails, 3)
            email_data = orjson.loads(scheduled_emails[0].data)
            self.assertEqual(email_data["context"]["ldap"], True)
            self.assertEqual(email_data["context"]["ldap_username"], "newuser_with_email")

    def test_followup_emails_count(self) -> None:
        hamlet = self.example_user("hamlet")
        iago = self.example_user("iago")
        cordelia = self.example_user("cordelia")
        realm = get_realm("zulip")

        # Hamlet has account only in Zulip realm so all onboarding emails should be sent
        send_account_registered_email(self.example_user("hamlet"))
        enqueue_welcome_emails(self.example_user("hamlet"))
        scheduled_emails = ScheduledEmail.objects.filter(users=hamlet).order_by(
            "scheduled_timestamp"
        )
        self.assert_length(scheduled_emails, 3)
        self.assertEqual(
            orjson.loads(scheduled_emails[0].data)["template_prefix"],
            "zerver/emails/account_registered",
        )
        self.assertEqual(
            orjson.loads(scheduled_emails[1].data)["template_prefix"],
            "zerver/emails/onboarding_zulip_topics",
        )
        self.assertEqual(
            orjson.loads(scheduled_emails[2].data)["template_prefix"],
            "zerver/emails/onboarding_zulip_guide",
        )

        ScheduledEmail.objects.all().delete()

        # The onboarding_zulip_guide email should not be sent to non-admin users in organizations
        # that are sent the `/for/communities/` guide; see note in enqueue_welcome_emails.
        realm.org_type = Realm.ORG_TYPES["community"]["id"]
        realm.save()

        # Hamlet is not an admin so the `/for/communities/` zulip_guide should not be sent
        send_account_registered_email(self.example_user("hamlet"))
        enqueue_welcome_emails(self.example_user("hamlet"))
        scheduled_emails = ScheduledEmail.objects.filter(users=hamlet).order_by(
            "scheduled_timestamp"
        )
        self.assert_length(scheduled_emails, 2)
        self.assertEqual(
            orjson.loads(scheduled_emails[0].data)["template_prefix"],
            "zerver/emails/account_registered",
        )
        self.assertEqual(
            orjson.loads(scheduled_emails[1].data)["template_prefix"],
            "zerver/emails/onboarding_zulip_topics",
        )

        ScheduledEmail.objects.all().delete()

        # Iago is an admin so the `/for/communities/` zulip_guide should be sent
        send_account_registered_email(self.example_user("iago"))
        enqueue_welcome_emails(self.example_user("iago"))
        scheduled_emails = ScheduledEmail.objects.filter(users=iago).order_by("scheduled_timestamp")
        self.assert_length(scheduled_emails, 3)
        self.assertEqual(
            orjson.loads(scheduled_emails[0].data)["template_prefix"],
            "zerver/emails/account_registered",
        )
        self.assertEqual(
            orjson.loads(scheduled_emails[1].data)["template_prefix"],
            "zerver/emails/onboarding_zulip_topics",
        )
        self.assertEqual(
            orjson.loads(scheduled_emails[2].data)["template_prefix"],
            "zerver/emails/onboarding_zulip_guide",
        )

        ScheduledEmail.objects.all().delete()

        # The organization_type context for "education_nonprofit" orgs is simplified to be "education"
        realm.org_type = Realm.ORG_TYPES["education_nonprofit"]["id"]
        realm.save()

        # Cordelia has account in more than 1 realm so onboarding_zulip_topics email should not be sent
        send_account_registered_email(self.example_user("cordelia"))
        enqueue_welcome_emails(self.example_user("cordelia"))
        scheduled_emails = ScheduledEmail.objects.filter(users=cordelia).order_by(
            "scheduled_timestamp"
        )
        self.assert_length(scheduled_emails, 2)
        self.assertEqual(
            orjson.loads(scheduled_emails[0].data)["template_prefix"],
            "zerver/emails/account_registered",
        )
        self.assertEqual(
            orjson.loads(scheduled_emails[1].data)["template_prefix"],
            "zerver/emails/onboarding_zulip_guide",
        )
        self.assertEqual(
            orjson.loads(scheduled_emails[1].data)["context"]["organization_type"],
            "education",
        )

        ScheduledEmail.objects.all().delete()

        # Only a subset of Realm.ORG_TYPES are sent the zulip_guide_followup email
        realm.org_type = Realm.ORG_TYPES["other"]["id"]
        realm.save()

        # In this case, Cordelia should only be sent the account_registered email
        send_account_registered_email(self.example_user("cordelia"))
        enqueue_welcome_emails(self.example_user("cordelia"))
        scheduled_emails = ScheduledEmail.objects.filter(users=cordelia)
        self.assert_length(scheduled_emails, 1)
        self.assertEqual(
            orjson.loads(scheduled_emails[0].data)["template_prefix"],
            "zerver/emails/account_registered",
        )

    def test_followup_emails_for_regular_realms(self) -> None:
        cordelia = self.example_user("cordelia")
        send_account_registered_email(self.example_user("cordelia"), realm_creation=True)
        enqueue_welcome_emails(self.example_user("cordelia"))
        scheduled_emails = ScheduledEmail.objects.filter(users=cordelia).order_by(
            "scheduled_timestamp"
        )
        assert scheduled_emails is not None
        self.assert_length(scheduled_emails, 2)
        self.assertEqual(
            orjson.loads(scheduled_emails[0].data)["template_prefix"],
            "zerver/emails/account_registered",
        )
        self.assertEqual(
            orjson.loads(scheduled_emails[1].data)["template_prefix"],
            "zerver/emails/onboarding_zulip_guide",
        )

        deliver_scheduled_emails(scheduled_emails[0])
        from django.core.mail import outbox

        self.assert_length(outbox, 1)

        message = outbox[0]
        self.assertIn("you have created a new OneHash Connect organization", message.body)
        self.assertNotIn("demo org", message.body)

    def test_followup_emails_for_demo_realms(self) -> None:
        cordelia = self.example_user("cordelia")
        cordelia.realm.demo_organization_scheduled_deletion_date = timezone_now() + timedelta(
            days=30
        )
        cordelia.realm.save()
        send_account_registered_email(self.example_user("cordelia"), realm_creation=True)
        enqueue_welcome_emails(self.example_user("cordelia"))
        scheduled_emails = ScheduledEmail.objects.filter(users=cordelia).order_by(
            "scheduled_timestamp"
        )
        assert scheduled_emails is not None
        self.assert_length(scheduled_emails, 2)
        self.assertEqual(
            orjson.loads(scheduled_emails[0].data)["template_prefix"],
            "zerver/emails/account_registered",
        )
        self.assertEqual(
            orjson.loads(scheduled_emails[1].data)["template_prefix"],
            "zerver/emails/onboarding_zulip_guide",
        )

        deliver_scheduled_emails(scheduled_emails[0])
        from django.core.mail import outbox

        self.assert_length(outbox, 1)

        message = outbox[0]
        self.assertIn("you have created a new demo OneHash Connect organization", message.body)

    def test_onboarding_zulip_guide_with_invalid_org_type(self) -> None:
        cordelia = self.example_user("cordelia")
        realm = get_realm("zulip")

        invalid_org_type_id = 999
        realm.org_type = invalid_org_type_id
        realm.save()

        with self.assertLogs(level="ERROR") as m:
            enqueue_welcome_emails(self.example_user("cordelia"))

        scheduled_emails = ScheduledEmail.objects.filter(users=cordelia)
        self.assert_length(scheduled_emails, 0)
        self.assertEqual(
            m.output,
            [f"ERROR:root:Unknown organization type '{invalid_org_type_id}'"],
        )


class TestOnboardingEmailDelay(ZulipTestCase):
    def verify_onboarding_email_schedule(
        self,
        user: UserProfile,
        date_joined: str,
        onboarding_zulip_topics: int,
        onboarding_zulip_guide: int,
    ) -> None:
        DAY_OF_WEEK = {
            "Monday": datetime(2018, 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            "Tuesday": datetime(2018, 1, 2, 1, 0, 0, 0, tzinfo=timezone.utc),
            "Wednesday": datetime(2018, 1, 3, 1, 0, 0, 0, tzinfo=timezone.utc),
            "Thursday": datetime(2018, 1, 4, 1, 0, 0, 0, tzinfo=timezone.utc),
            "Friday": datetime(2018, 1, 5, 1, 0, 0, 0, tzinfo=timezone.utc),
            "Saturday": datetime(2018, 1, 6, 1, 0, 0, 0, tzinfo=timezone.utc),
            "Sunday": datetime(2018, 1, 7, 1, 0, 0, 0, tzinfo=timezone.utc),
        }
        WEEKEND = [6, 7]

        user.date_joined = DAY_OF_WEEK[date_joined]
        onboarding_email_schedule = get_onboarding_email_schedule(user)

        # onboarding_zulip_topics
        day_sent = (
            DAY_OF_WEEK[date_joined] + onboarding_email_schedule["onboarding_zulip_topics"]
        ).isoweekday()
        self.assertEqual(day_sent, onboarding_zulip_topics)
        self.assertNotIn(day_sent, WEEKEND)

        # onboarding_zulip_guide
        day_sent = (
            DAY_OF_WEEK[date_joined] + onboarding_email_schedule["onboarding_zulip_guide"]
        ).isoweekday()
        self.assertEqual(day_sent, onboarding_zulip_guide)
        self.assertNotIn(day_sent, WEEKEND)

    def test_get_onboarding_email_schedule(self) -> None:
        user_profile = self.example_user("hamlet")

        # joined Monday: schedule = Wednesday:3, Friday:5,
        self.verify_onboarding_email_schedule(user_profile, "Monday", 3, 5)

        # joined Tuesday: schedule = Thursday:4, Monday:1
        self.verify_onboarding_email_schedule(user_profile, "Tuesday", 4, 1)

        # joined Wednesday: schedule = Friday:5, Tuesday:2
        self.verify_onboarding_email_schedule(user_profile, "Wednesday", 5, 2)

        # joined Thursday: schedule = Monday:1, Wednesday:3
        self.verify_onboarding_email_schedule(user_profile, "Thursday", 1, 3)

        # joined Friday: schedule = Tuesday:2, Thursday:4
        self.verify_onboarding_email_schedule(user_profile, "Friday", 2, 4)

        # joined Saturday: schedule = Monday:1, Wednesday:3
        self.verify_onboarding_email_schedule(user_profile, "Saturday", 1, 3)

        # joined Sunday: schedule = Tuesday:2, Thursday:4
        self.verify_onboarding_email_schedule(user_profile, "Sunday", 2, 4)

    def test_time_offset_for_onboarding_email_schedule(self) -> None:
        user_profile = self.example_user("hamlet")
        days_delayed = {
            "4": timedelta(days=4, hours=-1),
            "6": timedelta(days=6, hours=-1),
        }

        # Time offset of America/Phoenix is -07:00
        user_profile.timezone = "America/Phoenix"

        # Test date_joined == Friday in UTC, but Thursday in the user's time zone
        user_profile.date_joined = datetime(2018, 1, 5, 1, 0, 0, 0, tzinfo=timezone.utc)
        onboarding_email_schedule = get_onboarding_email_schedule(user_profile)

        # onboarding_zulip_topics email sent on Monday
        self.assertEqual(
            onboarding_email_schedule["onboarding_zulip_topics"],
            days_delayed["4"],
        )

        # onboarding_zulip_guide sent on Wednesday
        self.assertEqual(
            onboarding_email_schedule["onboarding_zulip_guide"],
            days_delayed["6"],
        )


class TestCustomWelcomeEmailSender(ZulipTestCase):
    def test_custom_welcome_email_sender(self) -> None:
        name = "Nonreg Email"
        email = self.nonreg_email("test")
        with override_settings(
            WELCOME_EMAIL_SENDER={
                "name": name,
                "email": email,
            }
        ):
            hamlet = self.example_user("hamlet")
            enqueue_welcome_emails(hamlet)
            scheduled_emails = ScheduledEmail.objects.filter(users=hamlet).order_by(
                "scheduled_timestamp"
            )
            email_data = orjson.loads(scheduled_emails[0].data)
            self.assertEqual(email_data["from_name"], name)
            self.assertEqual(email_data["from_address"], email)
