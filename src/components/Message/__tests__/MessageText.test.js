import React from 'react';
import testRenderer from 'react-test-renderer';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  generateChannel,
  generateUser,
  getTestClientWithUser,
  generateMessage,
} from 'mock-builders';
import { ChannelContext } from '../../../context';
import MessageText from '../MessageText';

jest.mock('../MessageOptions', () => jest.fn(() => <div />));

const alice = generateUser({ name: 'alice' });
const bob = generateUser({ name: 'bob' });
const onMentionsHoverMock = jest.fn();
const onMentionsClickMock = jest.fn();
const defaultProps = {
  message: generateMessage(),
  initialMessage: false,
  threadList: false,
  messageWrapperRef: { current: document.createElement('div') },
  onReactionListClick: () => {},
};

function generateAliceMessage(messageOptions) {
  return generateMessage({
    user: alice,
    ...messageOptions,
  });
}

async function renderMessageText(
  customProps,
  channelConfig,
  renderer = render,
) {
  const client = await getTestClientWithUser(alice);
  const channel = generateChannel({
    getConfig: () => channelConfig,
  });
  return renderer(
    <ChannelContext.Provider
      value={{
        channel,
        client,
        onMentionsHover: onMentionsHoverMock,
        onMentionsClick: onMentionsClickMock,
      }}
    >
      <MessageText {...defaultProps} {...customProps} />
    </ChannelContext.Provider>,
  );
}

const messageTextTestId = 'message-text-inner-wrapper';
describe('<MessageText />', () => {
  beforeEach(jest.clearAllMocks);
  it('should not render anything if message is not set', async () => {
    const { queryByTestId } = await renderMessageText({ message: undefined });
    expect(queryByTestId(messageTextTestId)).toBeNull();
  });

  it('should not render anything if message text is not set', async () => {
    const { queryByTestId } = await renderMessageText({ message: undefined });
    expect(queryByTestId(messageTextTestId)).toBeNull();
  });

  it('should set attachments css class modifier when message has text and is focused', async () => {
    const attachment = {
      type: 'image',
      image_url: 'image.jpg',
    };
    const message = generateAliceMessage({
      attachments: [attachment, attachment, attachment],
    });
    const { getByTestId } = await renderMessageText({ message });
    expect(getByTestId(messageTextTestId).className).toContain(
      '--has-attachment',
    );
  });

  it('should set emoji css class when message has text that is only emojis', async () => {
    const message = generateAliceMessage({ text: '🤖🤖🤖🤖' });
    const { getByTestId } = await renderMessageText({ message });
    expect(getByTestId(messageTextTestId).className).toContain('--is-emoji');
  });

  it('should handle message mention mouse hover event', async () => {
    const message = generateAliceMessage({ mentioned_users: [bob] });
    const { getByTestId } = await renderMessageText({ message });
    expect(onMentionsHoverMock).not.toHaveBeenCalled();
    fireEvent.mouseOver(getByTestId(messageTextTestId));
    expect(onMentionsHoverMock).toHaveBeenCalledTimes(1);
  });

  it('should handle custom message mention mouse hover event', async () => {
    const message = generateAliceMessage({ mentioned_users: [bob] });
    const customMentionsHover = jest.fn();
    const { getByTestId } = await renderMessageText({
      message,
      onMentionsHoverMessage: customMentionsHover,
    });
    expect(customMentionsHover).not.toHaveBeenCalled();
    fireEvent.mouseOver(getByTestId(messageTextTestId));
    expect(customMentionsHover).toHaveBeenCalledTimes(1);
  });

  it('should handle message mention mouse click event', async () => {
    const message = generateAliceMessage({ mentioned_users: [bob] });
    const { getByTestId } = await renderMessageText({ message });
    expect(onMentionsClickMock).not.toHaveBeenCalled();
    fireEvent.click(getByTestId(messageTextTestId));
    expect(onMentionsClickMock).toHaveBeenCalledTimes(1);
  });

  it('should handle custom message mention mouse click event', async () => {
    const message = generateAliceMessage({ mentioned_users: [bob] });
    const customMentionClick = jest.fn();
    const { getByTestId } = await renderMessageText({
      message,
      onMentionsClickMessage: customMentionClick,
    });
    expect(customMentionClick).not.toHaveBeenCalled();
    fireEvent.click(getByTestId(messageTextTestId));
    expect(customMentionClick).toHaveBeenCalledTimes(1);
  });

  it('should inform that message was not sent when message is has type "error"', async () => {
    const message = generateAliceMessage({ type: 'error' });
    const { getByText } = await renderMessageText({ message });
    expect(getByText('Error · Unsent')).toBeInTheDocument();
  });

  it('should inform that retry is possible when message has status "failed"', async () => {
    const message = generateAliceMessage({ status: 'failed' });
    const { getByText } = await renderMessageText({ message });
    expect(
      getByText('Message Failed · Click to try again'),
    ).toBeInTheDocument();
  });

  it('handle retry click when handleRetry is set', async () => {
    const text = 'Hello, world!';
    const onRetryClick = jest.fn();
    const message = generateAliceMessage({ text, status: 'failed' });
    const { getByTestId } = await renderMessageText({ message, onRetryClick });
    fireEvent.click(getByTestId('message-text-failed'));
    expect(onRetryClick).toHaveBeenCalledTimes(1);
  });

  it('render message html when unsafe html property is enabled', async () => {
    const message = generateAliceMessage({
      html: '<span data-testid="custom-html" />',
    });
    const { getByTestId } = await renderMessageText({
      message,
      unsafeHTML: true,
    });
    expect(getByTestId('custom-html')).toBeInTheDocument();
  });

  it('render message text', async () => {
    const text = 'Hello, world!';
    const message = generateAliceMessage({ text });
    const { getByText } = await renderMessageText({ message });
    expect(getByText(text)).toBeInTheDocument();
  });

  it('should render with a custom wrapper class when one is set', async () => {
    const customWrapperClass = 'custom-wrapper';
    const message = generateMessage({ text: 'hello world' });
    const tree = await renderMessageText(
      { message, customWrapperClass },
      {},
      testRenderer.create,
    );
    expect(tree.toJSON()).toMatchInlineSnapshot(`
      <div
        className="custom-wrapper"
      >
        <div
          className="str-chat__message-text-inner str-chat__message-simple-text-inner"
          data-testid="message-text-inner-wrapper"
          onClick={[Function]}
          onMouseOver={[Function]}
        >
          <p>
            hello world
          </p>
        </div>
      </div>
    `);
  });

  it('should render with a custom inner class when one is set', async () => {
    const customInnerClass = 'custom-inner';
    const message = generateMessage({ text: 'hi mate' });
    const tree = await renderMessageText(
      { message, customInnerClass },
      {},
      testRenderer.create,
    );
    expect(tree.toJSON()).toMatchInlineSnapshot(`
      <div
        className="str-chat__message-text"
      >
        <div
          className="custom-inner"
          data-testid="message-text-inner-wrapper"
          onClick={[Function]}
          onMouseOver={[Function]}
        >
          <p>
            hi mate
          </p>
        </div>
      </div>
    `);
  });

  it('should render with custom theme identifier in generated css classes when theme is set', async () => {
    const message = generateMessage({ text: 'whatup?!' });
    const tree = await renderMessageText(
      { message, theme: 'custom' },
      {},
      testRenderer.create,
    );
    expect(tree.toJSON()).toMatchInlineSnapshot(`
      <div
        className="str-chat__message-text"
      >
        <div
          className="str-chat__message-text-inner str-chat__message-custom-text-inner"
          data-testid="message-text-inner-wrapper"
          onClick={[Function]}
          onMouseOver={[Function]}
        >
          <p>
            whatup?!
          </p>
        </div>
      </div>
    `);
  });

  it('should render with an error icon when displayIconOnError is set', async () => {
    const message = generateMessage({ text: 'whatup?!', type: 'error' });
    const tree = await renderMessageText(
      { message, displayIconOnError: true },
      {},
      testRenderer.create,
    );
    expect(tree.toJSON()).toMatchInlineSnapshot(`
      <div
        className="str-chat__message-text"
      >
        <div
          className="str-chat__message-text-inner str-chat__message-simple-text-inner"
          data-testid="message-text-inner-wrapper"
          onClick={[Function]}
          onMouseOver={[Function]}
        >
          <div
            className="str-chat__simple-message--error-message"
          >
            <svg
              height="14"
              width="14"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7 0a7 7 0 1 0 0 14A7 7 0 0 0 7 0zm.875 10.938a.438.438 0 0 1-.438.437h-.875a.438.438 0 0 1-.437-.438v-.874c0-.242.196-.438.438-.438h.875c.241 0 .437.196.437.438v.874zm0-2.626a.438.438 0 0 1-.438.438h-.875a.438.438 0 0 1-.437-.438v-5.25c0-.241.196-.437.438-.437h.875c.241 0 .437.196.437.438v5.25z"
                fill="#EA152F"
                fillRule="evenodd"
              />
            </svg>
            Error · Unsent
          </div>
          <p>
            whatup?!
          </p>
        </div>
      </div>
    `);
  });
});
