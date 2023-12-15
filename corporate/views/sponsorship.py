from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

from corporate.lib.decorator import (
    authenticated_remote_realm_management_endpoint,
    authenticated_remote_server_management_endpoint,
)
from corporate.lib.stripe import (
    RealmBillingSession,
    RemoteRealmBillingSession,
    RemoteServerBillingSession,
    SponsorshipRequestForm,
)
from zerver.decorator import require_organization_member, zulip_login_required
from zerver.lib.response import json_success
from zerver.models import UserProfile


@zulip_login_required
def sponsorship_page(request: HttpRequest) -> HttpResponse:
    user = request.user
    assert user.is_authenticated

    billing_session = RealmBillingSession(user)
    context = billing_session.get_sponsorship_request_context()
    if context is None:
        return HttpResponseRedirect(reverse("billing_page"))

    return render(request, "corporate/sponsorship.html", context=context)


@authenticated_remote_realm_management_endpoint
def remote_realm_sponsorship_page(
    request: HttpRequest,
    billing_session: RemoteRealmBillingSession,
) -> HttpResponse:  # nocoverage
    context = billing_session.get_sponsorship_request_context()
    if context is None:
        return HttpResponseRedirect(
            reverse("remote_realm_billing_page", args=(billing_session.remote_realm.uuid,))
        )

    return render(request, "corporate/sponsorship.html", context=context)


@authenticated_remote_server_management_endpoint
def remote_server_sponsorship_page(
    request: HttpRequest,
    billing_session: RemoteServerBillingSession,
) -> HttpResponse:  # nocoverage
    context = billing_session.get_sponsorship_request_context()
    if context is None:
        return HttpResponseRedirect(
            reverse("remote_server_billing_page", args=(billing_session.remote_server.uuid,))
        )

    return render(request, "corporate/sponsorship.html", context=context)


@require_organization_member
def sponsorship(
    request: HttpRequest,
    user: UserProfile,
) -> HttpResponse:
    billing_session = RealmBillingSession(user)
    post_data = request.POST.copy()
    form = SponsorshipRequestForm(post_data)
    billing_session.request_sponsorship(form)
    return json_success(request)


@authenticated_remote_realm_management_endpoint
def remote_realm_sponsorship(
    request: HttpRequest,
    billing_session: RemoteRealmBillingSession,
) -> HttpResponse:  # nocoverage
    post_data = request.POST.copy()
    form = SponsorshipRequestForm(post_data)
    billing_session.request_sponsorship(form)
    return json_success(request)


@authenticated_remote_server_management_endpoint
def remote_server_sponsorship(
    request: HttpRequest,
    billing_session: RemoteServerBillingSession,
) -> HttpResponse:  # nocoverage
    post_data = request.POST.copy()
    form = SponsorshipRequestForm(post_data)
    billing_session.request_sponsorship(form)
    return json_success(request)
