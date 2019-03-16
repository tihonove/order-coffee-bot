import { pathExists, pathExistsSync, readJson, readJsonSync } from "fs-extra";
import * as path from "path";

interface ReadSettings {
    smtp: {
        host: string;
        port: number;
        auth: {
            user: string;
            pass: string;
        };
        sender: string;
    };
    telegramBotApiKey: string;
}

export async function readSettings(): Promise<ReadSettings> {
    const localSettingsName = path.join(__dirname, "settings.local.json");
    const settingsName = path.join(__dirname, "settings.json");

    // tslint:disable no-unsafe-any
    const settings: ReadSettings = (await pathExists(localSettingsName))
        ? await readJson(localSettingsName)
        : await readJson(settingsName);
    // tslint:enable no-unsafe-any
    return settings;
}

export function readSettingsSync(): ReadSettings {
    const localSettingsName = path.join(__dirname, "settings.local.json");
    const settingsName = path.join(__dirname, "settings.json");

    // tslint:disable no-unsafe-any
    const settings: ReadSettings = pathExistsSync(localSettingsName)
        ? readJsonSync(localSettingsName)
        : readJsonSync(settingsName);
    // tslint:enable no-unsafe-any
    return settings;
}
