import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import TelegramBot from "node-telegram-bot-api";

@Injectable()
export class TelegramNotificationService {
  private bot: TelegramBot | null = null;
  private chatId: string | null = null;
  private readonly logger = new Logger(TelegramNotificationService.name);
  private isEnabled: boolean = false;

  constructor(private configService: ConfigService) {
    const botToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    const chatId = this.configService.get<string>("TELEGRAM_CHAT_ID");

    if (botToken && chatId) {
      try {
        this.bot = new TelegramBot(botToken, { polling: false });
        this.chatId = chatId;
        this.isEnabled = true;
        this.logger.log("Telegram notifications enabled");
      } catch (error) {
        this.logger.warn("Failed to initialize Telegram bot", error);
      }
    } else {
      this.logger.warn(
        "Telegram bot token or chat ID not configured. Notifications disabled.",
      );
    }
  }

  async sendError(
    errorMessage: string,
    context?: Record<string, any>,
  ): Promise<void> {
    if (!this.isEnabled || !this.bot || !this.chatId) {
      this.logger.debug("Telegram notifications are disabled, skipping...");
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      let message = `🚨 *Error Alert*\n\n`;
      message += `*Time:* ${timestamp}\n`;
      message += `*Error:* ${errorMessage}\n`;

      if (context) {
        message += `\n*Context:*\n`;
        for (const [key, value] of Object.entries(context)) {
          message += `• ${key}: ${JSON.stringify(value)}\n`;
        }
      }

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });

      this.logger.log("Error notification sent to Telegram");
    } catch (error) {
      this.logger.error("Failed to send Telegram notification", error);
    }
  }

  async sendScanReceiptError(
    error: Error,
    additionalInfo?: Record<string, any>,
  ): Promise<void> {
    const context = {
      service: "AIService",
      method: "scanReceipt",
      errorName: error.name,
      errorStack: error.stack?.split("\n").slice(0, 3).join("\n"),
      ...additionalInfo,
    };

    await this.sendError(error.message, context);
  }
}
