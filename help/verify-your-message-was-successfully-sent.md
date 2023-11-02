# Verify your message was successfully sent

When you send a message, it first goes to a OneHash Connect server, and then the OneHash Connect
server sends it out to all the recipients.

Sometimes there can be delays if your device is on a poor network
connection. OneHash Connect lets you know when your message successfully reaches the
server.

## Verify that a message reached the OneHash Connect server

Look for a **timestamp** (like `4:53`) on the right side of the message. If
you see a timestamp, the message successfully reached the server.

You can see what a message without a timestamp looks like by disconnecting
your computer from the internet, and sending a message.

## When to resend

By default, OneHash Connect will try to resend the message when it is re-connected to
the internet.

If OneHash Connect gives up (or if the OneHash Connect server returns an error), it will
add two **red icons** (<i class="fa fa-refresh" style="color: red;"></i> <i
class="fa fa-times-circle" style="color: red;"></i>) to the right side of
the message. If you don't see the red icons, there is no need to resend.

If you do see the red icons, you can either

* Click **resend** (<i class="fa fa-refresh" style="color: red;"></i>)
  to attempt a resend.
* Click **cancel** (<i class="fa fa-times-circle" style="color: red;"></i>)
  to delete the message.
* Reload the page to cancel all the messages with red icons.
