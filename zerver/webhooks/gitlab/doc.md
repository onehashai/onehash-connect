Receive GitLab notifications in Connect!

1. {!create-stream.md!}

1. {!create-bot-construct-url.md!}

    By default, the Connect topics for merge requests will contain the
    title of the GitLab merge request.  You can change the topic format to
    just contain the merge request ID by adding
    `&use_merge_request_title=false` at the end of the URL.

    {!git-webhook-url-with-branches.md!}

1. Go to your repository on GitLab and click **Settings** on the left
   sidebar.  Click on **Integrations**.

1. Set **URL** to the URL constructed above. Select the events you
   you would like to receive notifications for, and click
   **Add Webhook**.

{!congrats.md!}

![](/static/images/integrations/gitlab/001.png)

!!! tip ""

    If your GitLab server and your Connect server are on a local network
    together, and you're running GitLab 10.5 or newer, you may need to enable
    GitLab's "Allow requests to the local network from hooks and
    services" setting (by default, recent GitLab versions refuse to post
    webhook events to servers on the local network).  You can find this
    setting near the bottom of the GitLab "Settings" page in the "Admin area".
