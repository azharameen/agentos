import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useChatStore } from "@/store/chat-store";
import { Moon, Sun, Monitor } from "lucide-react";

export function SettingsSidebar() {
    const {
        selectedModel,
        setSelectedModel,
        selectedAgent,
        setSelectedAgent,
    } = useChatStore();

    const [theme, setTheme] = useState<string>("dark");

    useEffect(() => {
        // Initialize theme from document class or local storage
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "dark" : "light");
    }, []);

    const handleThemeChange = (value: string) => {
        setTheme(value);
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        if (value === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
            root.classList.add(systemTheme);
        } else {
            root.classList.add(value);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4">
            <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
                <p className="text-sm text-muted-foreground">
                    Manage your application preferences.
                </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium leading-none">Appearance</h3>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <Label className="text-base">Theme</Label>
                        <span className="text-xs text-muted-foreground">
                            Select your preferred theme.
                        </span>
                    </div>
                    <Select value={theme} onValueChange={handleThemeChange}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">
                                <div className="flex items-center gap-2">
                                    <Sun className="size-4" /> Light
                                </div>
                            </SelectItem>
                            <SelectItem value="dark">
                                <div className="flex items-center gap-2">
                                    <Moon className="size-4" /> Dark
                                </div>
                            </SelectItem>
                            <SelectItem value="system">
                                <div className="flex items-center gap-2">
                                    <Monitor className="size-4" /> System
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium leading-none">Defaults</h3>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="model">Default Model</Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger id="model">
                                <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gpt-4">GPT-4</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                                <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="agent">Default Agent</Label>
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger id="agent">
                                <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">General Assistant</SelectItem>
                                <SelectItem value="coder">Code Expert</SelectItem>
                                <SelectItem value="writer">Writer</SelectItem>
                                <SelectItem value="researcher">Researcher</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium leading-none">Notifications</h3>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="flex flex-col gap-0.5">
                        <Label className="text-base">Enable Notifications</Label>
                        <span className="text-xs text-muted-foreground">
                            Receive alerts for important events.
                        </span>
                    </div>
                    <Switch defaultChecked />
                </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground">Genie v1.0.0</span>
            </div>
        </div>
    );
}
