Learn how Connect integrations work with this simple Hello World example!

This webhook is OneHash Connect's official [example
integration](/api/incoming-webhooks-walkthrough).

1. The Hello World webhook will use the `test` stream, which is created
    by default in the Connect development environment. If you are running
    Connect in production, you should make sure that this stream exists.

1. {!create-bot-construct-url.md!}

1. To trigger a notification using this example webhook, you can use
    `send_webhook_fixture_message` from a [Connect development
    environment](https://zulip.readthedocs.io/en/latest/development/overview.html):

    ```
        (zulip-py3-venv) vagrant@vagrant:/srv/zulip$
        ./manage.py send_webhook_fixture_message \
        > --fixture=zerver/tests/fixtures/helloworld/hello.json \
        > '--url=http://localhost:9991/api/v1/external/helloworld?api_key=abcdefgh&stream=stream%20name;'
    ```

    Or, use curl:

    ```
    curl -X POST -H "Content-Type: application/json" -d '{ "featured_title":"Marilyn Monroe", "featured_url":"https://en.wikipedia.org/wiki/Marilyn_Monroe" }' http://localhost:9991/api/v1/external/helloworld\?api_key=abcdefgh&stream=stream%20name;
    ```

{!congrats.md!}

![](/static/images/integrations/helloworld/001.png)
