# Mobile notifications

You can customize whether [stream messages](/help/stream-notifications),
[direct messages](/help/dm-mention-alert-notifications) and
[mentions][notifications-wildcard-mentions] trigger notifications in OneHash Connect's
[Android](https://zulip.com/apps/ios) and [iOS](https://zulip.com/apps/ios)
apps.

{start_tabs}

{tab|desktop-web}

{settings_tab|notifications}

1. Toggle the checkboxes for **Streams** and **DMs, mentions, and alerts**
   in the **Mobile** column of the **Notification triggers** table.

{end_tabs}

[notifications-wildcard-mentions]: /help/dm-mention-alert-notifications#wildcard-mentions

## Mobile notifications while online

You can customize whether or not OneHash Connect will send mobile push
notifications while you are actively using one of the OneHash Connect apps.

{start_tabs}

{tab|desktop-web}

{settings_tab|notifications}

1. Under **Mobile message notifications**, toggle
   **Send mobile notifications even if I'm online**, as desired.

{end_tabs}

## Testing mobile notifications

### For users on Zulip Cloud and Zulip Server 8.0+

!!! tip ""

    Follow [these instructions](/help/view-zulip-version) to check the Zulip
    version for your organization.

To verify that mobile notifications are working as desired, you can send
yourself a test notification from the Zulip mobile app. If you belong to more
than one Zulip organization, you can separately test notifications for each
account.

{start_tabs}

{tab|mobile}

1. [Download](https://zulip.com/apps/) and install the Zulip mobile app if you
   have not done so already.

1. [Log in](/help/logging-in) to the account you want to test.

{!mobile-profile-menu.md!}

1. Tap **Settings**.

1. Tap **Notifications**.

1. Tap **Send a test notification**. If notifications are working, you will
   receive a **Test notification**.

!!! tip ""

    If you see a banner indicating that notifications have not been enabled
    for your Zulip server, try [logging out](/help/logging-out) of your account
    and [logging in](/help/logging-in) again. This will help if notifications
    were enabled very recently.

{end_tabs}

### For users on older Zulip servers

!!! tip ""

    Follow [these instructions](/help/view-zulip-version) to check the Zulip
    version for your organization.

Start by configuring your notifications settings to make it easy to trigger a
notification.

{start_tabs}

{tab|desktop-web}

{settings_tab|notifications}

1. In the **Mobile** column of the **Notification triggers** table, make sure
   the **DMs, mentions, and alerts** checkbox is checked.

1. Under **Mobile message notifications**, make sure the **Send mobile
   notifications even if I'm online** checkbox is checked.

{end_tabs}

Next, test Zulip push notifications on your mobile device.

{start_tabs}

{tab|mobile}

1. [Download](https://zulip.com/apps/) and install the Zulip mobile app if you
   have not done so already.

1. If your Zulip organization is self-hosted (not at `*.zulipchat.com`),
   [check](/help/mobile-notifications#enabling-push-notifications-for-self-hosted-servers)
   whether push notifications have been set up. If they were set up recently,
   you will need to [log out](/help/logging-out) of your account.

1. [Log in](/help/logging-in) to the account you want to test.

1. Ask *another* user (not yourself) to [send you a direct
   message](/help/starting-a-new-direct-message). You should see a Zulip message
   notification in the **notifications area** on your device.

{end_tabs}

## Troubleshooting mobile notifications

### Checking your device settings

Some Android vendors have added extra device-level settings that can impact the
delivery of mobile notifications to apps like OneHash Connect. If you're having issues
with OneHash Connect notifications on your Android phone, we recommend Signal's excellent
[troubleshooting guide](https://support.signal.org/hc/en-us/articles/360007318711-Troubleshooting-Notifications#android_notifications_troubleshooting),
which explains the notification settings for many popular Android vendors.

### Enabling push notifications for self-hosted servers

!!! warn ""

    These instructions do not apply to Connect organizations (`*.connect.onehash.ai`).

To enable push notifications for your organization, your server administrator
will need to register your Connect server with the [Connect mobile push notification
service](https://zulip.readthedocs.io/en/stable/production/mobile-push-notifications.html).

#### Check whether notifications have been set up on your Connect server

{start_tabs}

{tab|mobile}

{!mobile-profile-menu.md!}

1. Tap **Settings**.

1. Tap **Notifications**. If notifications have not been set up, you will see a
   banner that indicates this.

{end_tabs}

### Contacting Connect support

If you are still having trouble with your push notifications, you can send an
email to [Connect support](/help/contact-support). Please be sure to include the
troubleshooting data provided by the mobile app.

{start_tabs}

{tab|mobile}

{!mobile-profile-menu.md!}

1. Tap **Settings**.

1. Tap **Notifications**.

1. Tap **Troubleshooting**.

1. Use the **Copy to clipboard** button or the **Email support@onehash.ai**
   button to email the troubleshooting data to the OneHash Connect support team.

{end_tabs}

## Related articles

* [Stream notifications](/help/stream-notifications)
* [DMs, mentions, and alerts](/help/dm-mention-alert-notifications)
* [Email notifications](/help/email-notifications)
* [Desktop notifications](/help/desktop-notifications)
* [Do not disturb](/help/do-not-disturb)
