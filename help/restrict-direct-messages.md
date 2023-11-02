# Restrict direct messages

{!admin-only.md!}

In OneHash Connect, users can exchange direct messages with other users,
[bots](/help/bots-and-integrations) and themselves. Organization
administrators can configure who is allowed to use direct messages.

## Configure who can use direct messages

!!! warn ""

    This feature is beta; see the notes below for details.

{start_tabs}

{settings_tab|organization-permissions}

1. Under **Other permissions**, configure **Who can use direct messages**.

{!save-changes.md!}

{end_tabs}

### Notes on restricting direct messages

* Disabling direct messages will cause sending a direct message to
throw an error; the OneHash Connect UI will appear to still allow direct
messages. We expect to make some UI adjustments when direct messages
are disabled during the beta period.

* Even if direct messages are disabled, users can still exchange
direct messages with bot users (this detail is important for
OneHash Connect's new user onboarding experience). Consider also [restricting
bot creation](/help/restrict-bot-creation) when using this feature.

* Restricting direct messages does not automatically [restrict creating
private streams](/help/configure-who-can-create-streams).
