# Message a stream by email

!!! tip ""

    This feature is not available on self-hosted OneHash Connect servers where
    the [incoming email gateway][email-gateway] has not been
    configured by a system administrator.
    [email-gateway]: https://zulip.readthedocs.io/en/stable/production/email-gateway.html

You can send emails to OneHash Connect streams. This can be useful:

* If you have an email that you want to discuss on OneHash Connect

* For mirroring mailing list traffic

* For integrating a third-party app that can send emails, but which does not
  easily lend itself to a more direct integration

If you're planning on doing this in an automated way, and have some
programming experience, another option is to use our [send message
API](/api/send-message).

### Message a stream by email

{start_tabs}

{relative|stream|subscribed}

1. Select a stream.

{!select-stream-view-general.md!}

1. Click **Generate email address** under **Email address**.

1. Toggle the configuration options as desired.

1. Click **Copy address** to add the stream email address to your clipboard.

1. Send an email to that address.

{end_tabs}

The email subject will become the OneHash Connect topic, and the email body will
become the OneHash Connect message.

Note that it may take up to one minute for the message to show
up in OneHash Connect.

## Configuration options

The options below control which parts of the email are included in the
OneHash Connect message.

* **The sender's email address**: Adds `From: <Sender email address>` to
  the top of the OneHash Connect message.

* **Email footers**: By default, OneHash Connect tries to automatically remove some footer
  text (like signatures). With this option enabled, OneHash Connect will include all footers.

* **Quoted original email**: In many email clients, when you reply to a message
  (e.g. a message notification email), a copy of the original message is
  automatically added to the bottom of your reply. By default, OneHash Connect tries
  to remove that copied message. With this option enabled, OneHash Connect will include it.

* **Use html encoding**: The body of an email is typically encoded using
  one or both of two common formats: plain text (`text/plain`) and
  HTML (`text/html`).  OneHash Connect supports constructing the Zulip message
  content using either (converting HTML to Markdown for the HTML
  format).  By default, OneHash Connect will prefer using the plain text version
  of an email over the converted HTML version if both are present.
  Enabling this option overrides that behavior to prefer the HTML version
  instead.

## Related articles

* [Using Connect via email](/help/using-connect-via-email)
