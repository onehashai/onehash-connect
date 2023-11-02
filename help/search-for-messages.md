# Searching for messages

It's easy to find the right conversation with OneHash Connect's powerful full-text search.
You can search for messages using keywords and filters via the search bar at the
top of the app. There is a convenient [**search filters reference**](#search-filters-reference)
in the OneHash Connect app that you can use whenever you need a reminder of the search
filters below.

## Keyword search

OneHash Connect lets you search messages and topics by keyword. For example:

* `new logo`: Search for messages with both `new` and `logo` in the message or
  its topic.
* `"new logo"`: Search for messages with the phrase "`new logo`" in the message
  or its topic.

Some details to keep in mind:

- Keywords are case-insensitive, so `wave` will also match `Wave`.
- OneHash Connect will find messages containing similar keywords (keywords with the same
  stem), so, e.g., `wave` will match `waves` and `waving`.
- OneHash Connect search ignores very common words like `a`, `the`, and about 100 others.
- [Emoji](/help/emoji-and-emoticons) in messages (but not [emoji
  reactions](/help/emoji-reactions)) are included in searches, so if you search
  for `octopus`, your results will include messages with the `:octopus:` emoji (
  <img src="/static/generated/emoji/images-google-64/1f419.png" alt="octopus"
  class="emoji-small"/>).

## Search filters

OneHash Connect also offers a wide array of search filters, which can be used on their
own, or in combination with keywords. For example:

* `stream:design`: Navigate to **#design**.
* `stream:design logo`: Search for the keyword `logo` within **#design**.
* `stream:design has:image new logo`: Search for messages in **#design** that
  include an image and contain the keywords `new` and `logo`. The keywords can
  appear in the message itself or its topic.

!!! tip ""

    As you start typing into the search box, OneHash Connect will suggest search filters
    you can use.

### Search by location

Sometimes you know approximately where the message you are looking for was sent.
OneHash Connect offers the following filters based on the location of the message.

* `stream:design`: Search within the stream **#design**.
* `stream:design topic:new+logo`: Search within the topic "new logo" in
  **#design**.
* `is:dm`: Search all your direct messages.
* `dm:Bo Lin`: Search 1-on-1 direct messages between you and Bo.
* `dm:Bo Lin, Elena García`: Search group direct messages
  between you, Bo, and Elena.
* `dm-including:Bo Lin`: Search all direct message conversations
  (1-on-1 and group) that include you and Bo, as well as any other users.
* `streams:public`: Search the history of all [public
  streams](/help/change-the-privacy-of-a-stream) in the organization, including
  streams you are not subscribed to; see details
  [below](#searching-shared-history).

### Search by sender

* `sender:Elena García`: Search messages sent by Elena.
* `sender:me`: Search messages you've sent.

!!! tip ""

    You can also access all messages someone has sent [via their **user
    card**](/help/view-messages-sent-by-a-user).

### Search for attachments or links

* `has:link`: Search messages that contain URLs.
* `has:attachment`: Search messages that contain an [uploaded
  file](/help/share-and-upload-files).
* `has:image`: Search messages that contain an uploaded image or link to an image.

!!! tip ""

    You can also [view](/help/manage-your-uploaded-files) all the files you have uploaded
    or [browse](/help/view-and-browse-images) all the images in the current view.

### Search your important messages

* `is:alerted`: Search messages that contain your [alert
  words](/help/dm-mention-alert-notifications#alert-words). Messages are
  included in the search results based on the alerts you had configured when you
  received the message.
* `is:mentioned`: Search messages where you were
  [mentioned](/help/mention-a-user-or-group).
* `is:starred`: Search your [starred messages](/help/star-a-message).

### Search by message status

* `is:resolved`: Search messages in [resolved topics](/help/resolve-a-topic).
* `-is:resolved`: Search messages in [unresolved topics](/help/resolve-a-topic).
* `is:unread`: Search your unread messages.

### Search by message ID

Each message in OneHash Connect has a unique ID, which is used for [linking to a specific
message](/help/link-to-a-message-or-conversation#link-to-zulip-from-anywhere).
You can use the search bar to navigate to a message by its ID.

* `near:12345`: Show messages around the message with ID `12345`.
* `id:12345`: Show only message `12345`.
* `stream:design near:1` Show the oldest messages in the **#design** stream.

### Exclude filters

All of OneHash Connect's search filters can be negated to **exclude** messages matching
the specified rule. For example:

- `stream:design -is:resolved -has:image`: Search messages in [unresolved
  topics](/help/resolve-a-topic) in the **#design** stream that don't contain
  images.

## Searching shared history

OneHash Connect's [stream permissions](/help/stream-permissions) model allows access to
the full history of public streams and private streams with shared history,
including messages sent before you joined the stream (or organization), or those
sent to public streams you are not subscribed to.

By default, OneHash Connect searches messages in your history, i.e., the
messages you actually received.  This avoids cluttering search results
with irrelevant messages from public streams you're not interested in.

If you'd like to instead search the organization's shared history, any query
using the `stream:` or `streams:` filters will search all messages that you have
access to in the selected stream(s).  For example:

* `streams:public logo`: Search for `logo` in all public streams in the
  organization.
* `streams:public sender:Elena García`: Search for all messages sent by
  Elena to any public stream.
* `stream:design logo`: Search for the word `logo` in all messages sent to
  **#design**, regardless of whether you were subscribed at the time the message
  was sent.

## Linking to search results

When you search OneHash Connect, the URL shown in the address bar of the OneHash Connect web app is a
permanent link to your search. You can share this link with others, and they
will see *their own* search results for your query.

## Search filters reference

A summary of the search filters above is available in the OneHash Connect app.

{start_tabs}

{relative|gear|search-filters}

{end_tabs}

## Related articles

* [Configure multi-language search](/help/configure-multi-language-search)
* [Link to a message or
  conversation](/help/link-to-a-message-or-conversation#link-to-connect-from-anywhere)
