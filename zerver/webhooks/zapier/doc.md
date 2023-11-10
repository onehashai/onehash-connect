Zapier supports integrations with
[hundreds of popular products](https://zapier.com/apps). Get notifications
sent by Zapier directly in Connect.

1. {!create-stream.md!}

1. {!create-an-incoming-webhook.md!}

1. Create an account on [Zapier](https://zapier.com).

1. Go to [Connect Integrations](https://zapier.com/apps/zulip/integrations).

1. Scroll down to click on the app you want to connect to Connect, or find it via
   the search box.

1. Under **Choose a Trigger**, select an event in the app you are connecting to Connect.

1. Under **Choose an Action**, select **Send a Private Message** or **Send a
   Stream Message**.

1. Follow the instructions in the right sidebar to set up the trigger event.

1. Click on the Connect action you selected in the center panel.

1. Under **Account** in the right sidebar, click **Sign in** to connect your bot
   to Zapier.

1. On the **Allow Zapier to access your Connect Account?** screen, enter the URL for
   your Connect organization, and the email address and API key of the bot you
   created above.

1. Under **Action** in the right sidebar, configure **Recipients** for a direct
   message, or **Stream name** and **Topic**, as well as **Message content**.

    !!! tip ""
        To send direct messages, enter a **Connect account email** in the
        **Recipients** box, if the email is [configured](/help/configure-email-visibility)
        to be visible to **Admins, moderators, members and guests**. Otherwise, enter
        `user` + [user ID](/help/view-someones-profile) + `@your Connect domain`. For
        example: `user123@acme.connect.onehash.ai`.

1. When everything has been configured as desired, click **Publish** to enable
   your Zap.


**Congratulations! You're done!**
