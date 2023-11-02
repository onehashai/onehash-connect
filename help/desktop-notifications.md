# Desktop notifications

OneHash Connect offers visual and audible desktop notifications. You can
customize whether [stream messages](/help/stream-notifications),
[direct messages](/help/dm-mention-alert-notifications) and
[mentions](/help/dm-mention-alert-notifications#wildcard-mentions)
trigger desktop notifications.

{start_tabs}

{settings_tab|notifications}

1. Toggle the checkboxes for **Streams** and **DMs, mentions, and alerts**
   in the **Desktop** column of the **Notification triggers** table.

{end_tabs}

## Notification sound

You can select the sound OneHash Connect uses for audible desktop notifications. Choosing
**None** disables all audible desktop notifications.

### Change notification sound

{start_tabs}

{settings_tab|notifications}

1. Under **Desktop message notifications**, configure
   **Notification sound**.

{end_tabs}

!!! tip ""
    To hear the selected sound, click the <i class="fa fa-play-circle"></i> to the right of your selection.

## Unread count badge

By default, OneHash Connect displays how many unmuted unread messages you have
in the organization on the [desktop app](https://zulip.com/apps/)
sidebar and on the browser tab icon. You can configure which types of
messages are included in the count. Choosing **None** disables unread
count badges.

### Configure unread count badge

{start_tabs}

{settings_tab|notifications}

1. Under **Desktop message notifications**, configure
   **Unread count badge**.

{end_tabs}

## Troubleshooting desktop notifications

First, make sure you have enabled
[desktop notifications for DMs](/help/dm-mention-alert-notifications) or for the
[stream](/help/stream-notifications) you are testing with.

Desktop notifications are triggered when a message arrives, and OneHash Connect is not
in focus or the message is offscreen. You must have OneHash Connect open in a browser
tab or in the OneHash Connect desktop app to receive desktop notifications.

**Visual desktop notifications** appear in the corner of your main monitor.
**Audible desktop notifications** make a sound.

The most common issue is that your browser or system settings are blocking
notifications from OneHash Connect.

### Check platform settings

{start_tabs}

{tab|chrome}

1. Click on **Secure** to the left of the URL bar. It should be green and
   have a lock icon next to it.

1. Set **Notifications** and **Sound** to **Allow**.

Alternate instructions:

1. Open the Chrome **Edit** menu. Select **Preferences**.

2. On the top left, select the menu icon (<i class="fa
   fa-bars"></i>). Select **Advanced**, and then **Privacy & Security**.
   Click on **Content settings** (partway down the page), and select
   **Notifications**.

3. If the OneHash Connect URL for your organization is listed under **Blocked**,
   select the menu icon (<i class="fa fa-ellipsis-v"></i>) to its right, and
   click **Remove**.

4. Next to **Allow**, click **Add**.

5. Paste the OneHash Connect URL for your organization into the site field, and click
    **Add**.

{tab|firefox}

1. Open the Firefox **Edit** menu. Select **Preferences**.

2. On the left, select **Privacy & Security**. Scroll to the **Permissions**
   section and select the **Settings** button next to **Notifications**.

3. Find the URL for your OneHash Connect organization, and adjust the **Status**
   selector to **Allow**.

{tab|desktop-app}

**Windows**

1. Click the **Start** button and select **Settings**. Select **System**,
   and then **Notifications & actions**.

2. Select **OneHash Connect** from the list of apps.

3. Configure the notification style that you would like OneHash Connect to use.

**macOS**

1. Open your Mac **System Preferences** and select **Notifications**.

2. Select **OneHash Connect** from the list of apps.

3. Configure the notification style that you would like OneHash Connect to use.

{end_tabs}

## Related articles

* [Stream notifications](/help/stream-notifications)
* [DMs, mentions, and alerts](/help/dm-mention-alert-notifications)
* [Email notifications](/help/email-notifications)
* [Mobile notifications](/help/mobile-notifications)
* [Do not disturb](/help/do-not-disturb)
