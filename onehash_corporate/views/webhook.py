import json
import logging

import stripe
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.http import HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from onehash_corporate.lib.stripe import STRIPE_API_VERSION
from onehash_corporate.lib.stripe_event_handler import (
    handle_checkout_session_completed_event,
    handle_payment_intent_payment_failed_event,
    handle_payment_intent_succeeded_event,
)
from onehash_corporate.models import Events, PaymentIntents, Sessions
from zproject.config import get_secret

billing_logger = logging.getLogger("onehash_corporate.stripe")


@csrf_exempt
def stripe_webhook(request: HttpRequest) -> HttpResponse:
    stripe_webhook_endpoint_secret = get_secret("stripe_webhook_endpoint_secret", "")
    if stripe_webhook_endpoint_secret:
        try:
            stripe_event = stripe.Webhook.construct_event(
                request.body,
                request.headers["Stripe-Signature"],
                stripe_webhook_endpoint_secret,
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return HttpResponse(status=400)
    else:
        # Handle the case where the webhook endpoint secret is not configured
        return HttpResponse(status=400)

    if stripe_event.api_version != STRIPE_API_VERSION:
        error_message = f"Mismatch between billing system Stripe API version({STRIPE_API_VERSION}) and Stripe webhook event API version({stripe_event.api_version})."
        billing_logger.error(error_message)
        return HttpResponse(status=400)

    if stripe_event.type not in [
        "checkout.session.completed",
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
    ]:
        return HttpResponse(status=200)

    if Events.objects.filter(stripe_event_id=stripe_event.id).exists():
        return HttpResponse(status=200)

    event = Events(stripe_event_id=stripe_event.id, type=stripe_event.type)

    if stripe_event.type == "checkout.session.completed":
        stripe_session = stripe_event.data.object
        assert isinstance(stripe_session, stripe.checkout.Session)
        try:
            session = Sessions.objects.get(stripe_session_id=stripe_session.id)
        except Sessions.DoesNotExist:
            return HttpResponse(status=200)
        event.content_type = ContentType.objects.get_for_model(Sessions)
        event.object_id = session.id
        event.save()
        handle_checkout_session_completed_event(stripe_session, event)
    elif stripe_event.type == "payment_intent.succeeded":
        stripe_payment_intent = stripe_event.data.object
        assert isinstance(stripe_payment_intent, stripe.PaymentIntent)
        try:
            payment_intent = PaymentIntents.objects.get(
                stripe_payment_intent_id=stripe_payment_intent.id
            )
        except PaymentIntents.DoesNotExist:
            # PaymentIntent that was not manually created from the billing system.
            # Could be an Invoice getting paid which is not an event we are interested in.
            return HttpResponse(status=200)
        event.content_type = ContentType.objects.get_for_model(PaymentIntents)
        event.object_id = payment_intent.id
        event.save()
        handle_payment_intent_succeeded_event(stripe_payment_intent, event)
    elif stripe_event.type == "payment_intent.payment_failed":
        stripe_payment_intent = stripe_event.data.object
        try:
            assert isinstance(stripe_payment_intent, stripe.PaymentIntent)
            payment_intent = PaymentIntents.objects.get(
                stripe_payment_intent_id=stripe_payment_intent.id
            )
        except PaymentIntents.DoesNotExist:
            # PaymentIntent that was not manually created from the billing system.
            # Could be an Invoice getting paid which is not an event we are interested in.
            return HttpResponse(status=200)
        event.content_type = ContentType.objects.get_for_model(PaymentIntents)
        event.object_id = payment_intent.id
        event.save()
        handle_payment_intent_payment_failed_event(stripe_payment_intent, event)
    return HttpResponse(status=200)
