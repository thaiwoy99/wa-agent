export type OutgoingText = {
  phoneNumberId: string;
  to: string;
  text: string;
};

export type SendResult = {
  waMessageId: string;
};

export interface MessageSender {
  sendText(message: OutgoingText): Promise<SendResult>;
}