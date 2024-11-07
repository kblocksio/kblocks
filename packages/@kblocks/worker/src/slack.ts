type Context  = {
  ts?: string;
  channel?: string;
};

export type Blocks = Array<{
  type: "section",
  text: {
    type: "mrkdwn",
    text: string,
  },
}>;

const SLACK_API_TOKEN = process.env.SLACK_API_TOKEN;
if (!SLACK_API_TOKEN) {
  console.error('Warning: SLACK_API_TOKEN environment variable is not set, not sending message to Slack');
}

async function sendSlackMessage(channel: string, blocks: Blocks, thread_ts?: string): Promise<Context> {
  try {
    if (!SLACK_API_TOKEN) {
      return {
        channel: undefined,
        ts: undefined,
      };
    }

    const channelID = channel;

    const url = 'https://slack.com/api/chat.postMessage';

    const payload = {
      channel: channelID,
      thread_ts: thread_ts,
      blocks,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SLACK_API_TOKEN}`,
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
    console.error({ channel, thread_ts, blocks });
    return {
      ts: undefined,
      channel: undefined,
    };
  }
}

async function editSlackMessage(ctx: Context, blocks: any) {
  try {
    if (!SLACK_API_TOKEN) {
      return;
    }
  
    const url = 'https://slack.com/api/chat.update';
  
    const payload = {
      channel: ctx.channel,
      ts: ctx.ts,
      blocks,
    };
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SLACK_API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
  
    const body = await response.json();
    if (!body.ok) {
      throw new Error(`Failed to send message to Slack: ${body.error}`);
    }  
  } catch (e) {
    console.error('Failed to send message to Slack: ', e);
    console.error({ ctx, blocks });
  }
}

export const newSlackThread = async (channel: string, initialMessage: string) => {
  const renderBlocks = (message: string): Blocks => [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message,
      },
    },
  ];

  const threadContext = await sendSlackMessage(channel, renderBlocks(initialMessage));
  if (!threadContext) {
    return {
      update: async () => {},
      post: async () => {},
      postBlocks: async () => {},
    };
  }

  const postBlocks = async (blocks: Blocks)  => sendSlackMessage(channel, blocks, threadContext.ts);
  const post       = async (message: string) => postBlocks(renderBlocks(message));
  const update     = async (message: string) => editSlackMessage(threadContext, renderBlocks(message));

  return {
    update,
    post,
    postBlocks,
  }
};
