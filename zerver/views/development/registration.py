import random
import string
from typing import TYPE_CHECKING, Any, cast

from django.conf import settings
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt

from confirmation.models import Confirmation, create_confirmation_link
from zerver.context_processors import get_realm_from_request
from zerver.lib.response import json_success
from zerver.models import Realm, UserProfile
from zerver.views.auth import create_preregistration_realm, create_preregistration_user
from zerver.views.registration import accounts_register

if TYPE_CHECKING:
    from django.http.request import _ImmutableQueryDict


# This is used only by the Puppeteer test in realm-creation.ts.
def confirmation_key(request: HttpRequest) -> HttpResponse:
    return json_success(request, data=request.session["confirmation_key"])


def modify_postdata(request: HttpRequest, **kwargs: Any) -> None:
    new_post = request.POST.copy()
    for key, value in kwargs.items():
        new_post[key] = value
    new_post._mutable = False
    request.POST = cast("_ImmutableQueryDict", new_post)


def generate_demo_realm_name() -> str:
    letters = "".join(random.SystemRandom().choice(string.ascii_lowercase) for _ in range(4))
    digits = "".join(random.SystemRandom().choice(string.digits) for _ in range(4))
    demo_realm_name = f"demo-{letters}{digits}"
    return demo_realm_name


@csrf_exempt
def register_development_user(request: HttpRequest) -> HttpResponse:
    realm = get_realm_from_request(request)
    if realm is None:  # nocoverage
        return HttpResponseRedirect(
            f"{settings.EXTERNAL_URI_SCHEME}{settings.REALM_HOSTS['zulip']}/devtools/register_user/",
            status=307,
        )

    count = UserProfile.objects.count()
    name = f"user-{count}"
    email = f"{name}@zulip.com"
    prereg = create_preregistration_user(email, realm, password_required=False)
    activation_url = create_confirmation_link(prereg, Confirmation.USER_REGISTRATION)
    key = activation_url.split("/")[-1]
    # Need to add test data to POST request as it doesn't originally contain the required parameters
    modify_postdata(request, key=key, full_name=name, password="test", terms="true")

    return accounts_register(request)


@csrf_exempt
def register_development_realm(request: HttpRequest) -> HttpResponse:
    count = UserProfile.objects.count()
    name = f"user-{count}"
    email = f"{name}@zulip.com"
    realm_name = f"realm-{count}"
    realm_type = Realm.ORG_TYPES["business"]["id"]
    realm_default_language = "en"
    realm_subdomain = realm_name
    prereg_realm = create_preregistration_realm(
        email, realm_name, realm_subdomain, realm_type, realm_default_language
    )
    activation_url = create_confirmation_link(
        prereg_realm, Confirmation.REALM_CREATION, no_associated_realm_object=True
    )
    key = activation_url.split("/")[-1]
    # Need to add test data to POST request as it doesn't originally contain the required parameters
    modify_postdata(
        request,
        key=key,
        realm_name=realm_name,
        realm_type=realm_type,
        realm_default_language=realm_default_language,
        full_name=name,
        password="test",
        realm_subdomain=realm_subdomain,
        terms="true",
    )

    return accounts_register(request)


@csrf_exempt
def register_demo_development_realm(request: HttpRequest) -> HttpResponse:
    # Demo organization owners are not required to provide a name or email.
    name = "Your name"
    email = ""
    realm_default_language = "en"
    realm_name = generate_demo_realm_name()
    realm_type = Realm.ORG_TYPES["unspecified"]["id"]
    realm_subdomain = realm_name
    email_address_visibility = UserProfile.EMAIL_ADDRESS_VISIBILITY_NOBODY
    prereg_realm = create_preregistration_realm(
        email, realm_name, realm_subdomain, realm_type, realm_default_language
    )
    activation_url = create_confirmation_link(
        prereg_realm, Confirmation.REALM_CREATION, no_associated_realm_object=True
    )
    key = activation_url.split("/")[-1]
    # Need to add test data to POST request as it doesn't originally contain the required parameters
    modify_postdata(
        request,
        key=key,
        realm_name=realm_name,
        realm_type=realm_type,
        realm_default_language=realm_default_language,
        email_address_visibility=email_address_visibility,
        full_name=name,
        password="test",
        realm_subdomain=realm_subdomain,
        terms="true",
        is_demo_organization="true",
    )

    return accounts_register(request)
