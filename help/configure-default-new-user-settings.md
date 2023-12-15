# Configure default settings for new users

{!admin-only.md!}

Organization administrators can configure the default values of
personal preference settings for new users joining the
organization. This can help seamlessly customize the OneHash Connect experience
to match how the organization in question is using OneHash Connect.

Existing users' preferences cannot be modified by administrators, and
users will be able to customize their own settings once they
join. Administrators can customize defaults for all personal
preference settings, including the following:

* Privacy settings:
    * Displaying [availability](/help/status-and-availability) to other users
    * Allowing others to see when the user has [read
      messages](/help/read-receipts)
    * Allowing others to see when the user is [typing a
      message](/help/typing-notifications)

* Preferences:
    * [Language](/help/change-your-language)
    * [Time format](/help/change-the-time-format)
    * [Light theme vs. dark theme](/help/dark-theme)
    * [Emoji theme](/help/emoji-and-emoticons#change-your-emoji-set)
    * [Home view](/help/configure-home-view)
      ([Inbox](/help/inbox) vs.
      [Recent conversations](/help/recent-conversations) vs.
      [All messages](/help/reading-strategies#all-messages))

* Notification settings:
    * What types of messages [trigger notifications][default-notifications]
    * Which topics users will [automatically follow](/help/follow-a-topic). This
      minimizes the need to [mention](/help/mention-a-user-or-group) other users
      to get their attention.

[default-notifications]: /help/stream-notifications#configure-default-notifications-for-all-streams

## Configure default settings for new users

{start_tabs}

{settings_tab|default-user-settings}

1. Review all settings and adjust as needed.

{end_tabs}

## Configure default language for new users

Your organization's [language](/help/configure-organization-language) will be
the default language for new users when OneHash Connect cannot detect their language
preferences from their browser, including all users [created via the OneHash Connect
API](/api/create-user).

{start_tabs}

{settings_tab|organization-settings}

1. Under **Automated messages and emails**, change the **Language for
   automated messages and invitation emails**.

{!save-changes.md!}

{end_tabs}

## Related articles

* [Setting up your organization](/help/getting-your-organization-started-with-connect)
* [Customize settings for new users](/help/customize-settings-for-new-users)
* [Set default streams for new users](/help/set-default-streams-for-new-users)
* [Invite users to join](/help/invite-users-to-join)
