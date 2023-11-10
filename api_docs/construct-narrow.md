# Construct a narrow

A **narrow** is a set of filters for Connect messages, that can be based
on many different factors (like sender, stream, topic, search
keywords, etc.). Narrows are used in various places in the the Connect
API (most importantly, in the API for fetching messages).

It is simplest to explain the algorithm for encoding a search as a
narrow using a single example. Consider the following search query
(written as it would be entered in the Connect web app's search box).
It filters for messages sent to stream `announce`, not sent by
`iago@onehash.ai`, and containing the words `cool` and `sunglasses`:

```
stream:announce -sender:iago@onehash.ai cool sunglasses
```

This query would be JSON-encoded for use in the Connect API using JSON
as a list of simple objects, as follows:

```json
[
    {
        "operator": "stream",
        "operand": "announce"
    },
    {
        "operator": "sender",
        "operand": "iago@onehash.ai",
        "negated": true
    },
    {
        "operator": "search",
        "operand": "cool sunglasses"
    }
]
```

The Connect help center article on [searching for messages](/help/search-for-messages)
documents the majority of the search/narrow options supported by the
Connect API.

Note that many narrows, including all that lack a `stream` or `streams`
operator, search the current user's personal message history. See
[searching shared history](/help/search-for-messages#searching-shared-history)
for details.

**Changes**: In Connect 7.0 (feature level 177), support was added
for three filters related to direct messages: `is:dm`, `dm` and
`dm-including`. The `dm` operator replaced and deprecated the
`pm-with` operator. The `is:dm` filter replaced and deprecated
the `is:private` filter. The `dm-including` operator replaced and
deprecated the `group-pm-with` operator.

The `dm-including` and `group-pm-with` operators return slightly
different results. For example, `dm-including:1234` returns all
direct messages (1-on-1 and group) that include the current user
and the user with the unique user ID of `1234`. On the other hand,
`group-pm-with:1234` returned only group direct messages that included
the current user and the user with the unique user ID of `1234`.

Both `dm` and `is:dm` are aliases of `pm-with` and `is:private`
respectively, and return the same exact results that the deprecated
filters did.

## Narrows that use IDs

### Message IDs

The `near` and `id` operators, documented in the help center, use message
IDs for their operands.

* `near:12345`: Search messages around the message with ID `12345`.
* `id:12345`: Search for only message with ID `12345`.

The message ID operand for the `id` operator may be encoded as either a
number or a string. The message ID operand for the `near` operator must
be encoded as a string.

**Changes**: Prior to Connect 8.0 (feature level 194), the message ID
operand for the `id` operator needed to be encoded as a string.


```json
[
    {
        "operator": "id",
        "operand": 12345
    }
]
```

### Stream and user IDs

There are a few additional narrow/search options (new in Connect 2.1)
that use either stream IDs or user IDs that are not documented in the
help center because they are primarily useful to API clients:

* `stream:1234`: Search messages sent to the stream with ID `1234`.
* `sender:1234`: Search messages sent by user ID `1234`.
* `dm:1234`: Search the direct message conversation between
  you and user ID `1234`.
* `dm:1234,5678`: Search the direct message conversation between
  you, user ID `1234`, and user ID `5678`.
* `dm-including:1234`: Search all direct messages (1-on-1 and group)
  that include you and user ID `1234`.

The operands for these search options must be encoded either as an
integer ID or a JSON list of integer IDs. For example, to query
messages sent by a user 1234 to a direct message thread with yourself,
user 1234, and user 5678, the correct JSON-encoded query is:

```json
[
    {
        "operator": "dm",
        "operand": [1234, 5678]
    },
    {
        "operator": "sender",
        "operand": 1234
    }
]
```
