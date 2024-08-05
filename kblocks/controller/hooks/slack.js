async function sendSlackMessage(channel, message, thread_ts) {
  try {
    const slackToken = process.env.SLACK_API_TOKEN;
    if (!slackToken) {
      console.error('Warning: SLACK_API_TOKEN environment variable is not set - not sending message to Slack');
      return;
    }

    const channelID = channel;

    const url = 'https://slack.com/api/chat.postMessage';

    const payload = {
      channel: channelID,
      thread_ts: thread_ts,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackToken}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    if (!body.ok) {
      throw new Error(body.error);
    }

    return {
      ts: body.ts,
      channel: body.channel,
    };
  } catch (e) {
    console.error('Failed to send message to Slack: ', e);
    console.error({ channel, message, thread_ts });
    return {
      ts: null,
      channel: null,
    };
  }
}

async function editSlackMessage(ctx, message) {
  try {
    const slackToken = process.env.SLACK_API_TOKEN;
    if (!slackToken) {
      console.error('Warning: SLACK_API_TOKEN environment variable is not set - not sending message to Slack');
      return;
    }
  
    const url = 'https://slack.com/api/chat.update';
  
    const payload = {
      channel: ctx.channel,
      ts: ctx.ts,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
      ],
    };
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${slackToken}`,
      },
      body: JSON.stringify(payload),
    });
  
    const body = await response.json();
    if (!body.ok) {
      throw new Error(`Failed to send message to Slack: ${body.error}`);
    }  
  } catch (e) {
    console.error('Failed to send message to Slack: ', e);
    console.error({ ctx, message });
  }
}

const newSlackThread = async (channel, initialMessage) => {
  const threadContext = await sendSlackMessage(channel, initialMessage);
  if (!threadContext) {
    return {
      update: async () => {},
      post: async () => {},
    };
  }

  const post = async (message) => {
    await sendSlackMessage(channel, message, threadContext.ts);
  };

  const update = async (message) => {
    await editSlackMessage(threadContext, message);
  };

  return {
    update,
    post,
  }
};

exports.newSlackThread = newSlackThread;

// (async () => {

//   const thread = await newSlackThread('monadaco-platform', "hello, slack! thread!");
//   thread.update("hello, slack! thread! <-- updated");

//   // thread.post("another message");

//   // const ctx = await sendSlackMessage('monadaco-platform', "hello, slack! thread!");
//   // console.log(ctx);
//   // await editSlackMessage(ctx, "hello, slack! thread! <-- updated");
// })().catch(e => console.error(e));