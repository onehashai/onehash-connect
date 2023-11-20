# Import from Gitter (beta)

You can import your current workspace into a OneHash Connect organization. It's a great way
to preserve your workspace history when you migrate to OneHash Connect, and to
make the transition easy for the members of your organization.

The import will include your organization's:

* **Name**
* **Message history**, including attachments and emoji reactions
* **Users**, including names and avatars
* **Channels**, including all user subscriptions

## Import process overview

To import your Gitter organization into OneHash Connect, you will need to take the
following steps, which are described in more detail below:

{start_tabs}

1. [Export your Gitter data.](#export-your-gitter-data)

1. [Import your Gitter data into OneHash Connect.](#import-your-data-into-connect)

1. [Get your organization started with OneHash Connect!](#get-your-organization-started-with-connect)

{end_tabs}

## Import your organization from Gitter into OneHash Connect

### Export your Gitter data

Gitter's [data export tool](https://github.com/minrk/archive-gitter) allows you
to export all public channel messages.

{start_tabs}

1. Export your Gitter data. You will receive `.json` files of the public
   rooms that you are a part of.

1. Select the `gitter_data.json` file of the room which you want to
   import into OneHash Connect.

!!! warn ""

    **Note:** You will need a Gitter API token to export data. You can get this
    token by following the instructions in the **Getting Started** section of
    the [Gitter documentation](https://developer.gitter.im/docs/).

{end_tabs}

### Import your data into OneHash Connect

{!import-your-data-into-zulip.md!}

{start_tabs}

{tab|zulip-cloud}

{!import-into-a-zulip-cloud-organization.md!}

1. The **username** that will have the [owner role](/help/roles-and-permissions)
   in your OneHash Connect organization.

{!import-zulip-cloud-organization-warning.md!}

{tab|self-hosting}

{!import-into-a-self-hosted-zulip-server.md!}

1. To import into an organization hosted on the root domain
   (`EXTERNAL_HOST`) of the OneHash Connect installation, run the following
   commands.

    {!import-self-hosted-server-tips.md!}

    ```
    cd /home/zulip/deployments/current
    ./scripts/stop-server
    ./manage.py convert_gitter_data /tmp/gitter_data.json --output /tmp/converted_gitter_data
    ./manage.py import '' /tmp/converted_gitter_data
    ./scripts/start-server
    ```

    Alternatively, to import into a custom subdomain, run:

    ```
    cd /home/zulip/deployments/current
    ./scripts/stop-server
    ./manage.py convert_gitter_data /tmp/gitter_data.json --output /tmp/converted_gitter_data
    ./manage.py import <subdomain> /tmp/converted_gitter_data
    ./scripts/start-server
    ```

1. Follow [step 4](https://zulip.readthedocs.io/en/stable/production/install.html#step-4-configure-and-use)
   of the guide for [installing a new OneHash Connect
   server](https://zulip.readthedocs.io/en/stable/production/install.html).

{end_tabs}

#### Import details

Whether you are using OneHash Connect Cloud or self-hosting OneHash Connect, here are a few notes to
keep in mind about the import process:

- [Gitter's export tool](https://github.com/minrk/archive-gitter) does not export
  workspace settings, so you will need to [configure the settings for your OneHash Connect
  organization](/help/customize-organization-settings). This includes settings
  like [email visibility](/help/configure-email-visibility),
  [message editing permissions](/help/restrict-message-editing-and-deletion),
  and [how users can join your organization](/help/restrict-account-creation).

- Gitter's export tool does not export user settings, so users in your organization
  may want to [customize their account settings](/help/getting-started-with-connect).

- The [Gitter API][gitter-api-user-data] doesn't contain data on which users are
  administrators of a Gitter channel.  As a result, all Gitter users are imported
  into OneHash Connect as [members](/help/roles-and-permissions).

- Gitter's export tool doesn't export email addresses, only GitHub usernames.
  OneHash Connect's import tool will set GitHub as the only authentication method enabled
  by default to avoid user confusion.

- You can merge multiple Gitter channels into a single OneHash Connect
  organization using [this
  tool](https://github.com/minrk/archive-gitter/pull/5).

- OneHash Connect's import tool doesn't translate Gitter's Markdown format into OneHash Connect's
  Markdown format (there are a few corner cases where the syntax is different).
  Additionally, Gitter's issue mention syntax isn't translated.

- Message edit history is not imported.

[grant-admin-access]: https://zulip.readthedocs.io/en/stable/production/management-commands.html#other-useful-manage-py-commands
[gitter-api-user-data]: https://developer.gitter.im/docs/user-resource

## Get your organization started with OneHash Connect

Once the import process is completed, you will need to:

{start_tabs}

1. [Configure the settings for your organization](/help/customize-organization-settings),
   which are not exported. This includes settings like [email
   visibility](/help/configure-email-visibility), [message editing
   permissions](/help/restrict-message-editing-and-deletion),
   and [how users can join your organization](/help/restrict-account-creation).

2. [Configure user roles](/help/change-a-users-role). Only organization owners
   and administrators can do this.
    * If you [import into Connect Cloud](#import-your-data-into-zulip), you will
    specify the user whose account will have the owner role when you request the
    import.
    * If you self-host, you can follow the OneHash Connect documentation on [making a user an
    organization owner from the terminal][grant-admin-access] to mark the appropriate
    users as organization owners.

3. All users from your previous workspace will have accounts in your new OneHash Connect
   organization. However, you will need to let users know about their new
   accounts, and [how they will log in for the first time
   ](#how-users-will-log-in-for-the-first-time).

4. Share the URL for your new OneHash Connect organization, and (recommended) the [Getting
   started with Connect guide](/help/getting-started-with-connect).

5. Migrate any [integrations](/integrations/).

{end_tabs}

## How users will log in for the first time

When you create your organization, users will immediately be able to log in
without a password using GitHub as the [authentication method
](/help/configure-authentication-methods). Once they log
in, users whose accounts have been imported will need to [change their Connect
email address](/help/change-your-email-address) in order to receive [email
notifications](/help/email-notifications).

!!! warn ""

    A user's email notifications will not work until they update the email
    associated with their OneHash Connect account.

When user accounts are imported, users initially do not have passwords
configured. Users can [reset their own passwords](/help/change-your-password) by
following the instructions on your OneHash Connect organization's login page.

!!! tip ""

    For security reasons, passwords are never exported.

## Related articles

* [Choosing between Connect Cloud and self-hosting](/help/connect-cloud-or-self-hosting)
* [Setting up your organization](/help/getting-your-organization-started-with-connect)
* [Getting started with Connect](/help/getting-started-with-connect)
