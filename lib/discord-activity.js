class DiscordActivity {
  constructor(launcherName) { this.launcherName = launcherName; }

  create(context, buttons = []) {
    const account = context.microsoft && !context.guest ? 'Лицензия Microsoft' : 'Офлайн / пиратка';
    const activity = {
      details: context.memoryMax ? `Minecraft через ${this.launcherName}` : `В ${this.launcherName}`,
      state: context.nickname ? `${context.nickname} · ${account}` : 'Выбирает сборку',
      startTimestamp: context.startTimestamp || Date.now(),
      largeImageText: this.launcherName
    };
    if (buttons.length) activity.buttons = buttons;
    return activity;
  }
}

module.exports = { DiscordActivity };
