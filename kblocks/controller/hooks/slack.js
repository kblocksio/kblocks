async function sendSlackMessage(channel, message) {
  const slackToken = process.env.SLACK_API_TOKEN;
  if (!slackToken) {
    console.error('Warning: SLACK_API_TOKEN environment variable is not set - not sending message to Slack');
    return;
  }

  const channelID = channel;

  const url = 'https://slack.com/api/chat.postMessage';

  const payload = {
    channel: channelID,
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
}

exports.sendSlackMessage = sendSlackMessage;

// (async () => {
//   await sendSlackMessage('monadaco-platform', "hello, slack!");
// })().catch(e => console.error(e));