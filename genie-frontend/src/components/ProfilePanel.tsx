"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Key, Save, Upload } from "lucide-react";

export function ProfilePanel() {
    const [userInfo, setUserInfo] = useState({
        name: "User",
        email: "user@example.com",
        avatarUrl: ""
    });

    const [apiKey, setApiKey] = useState("");
    const [showApiKey, setShowApiKey] = useState(false);

    const handleSaveProfile = () => {
        // TODO: Implement profile save logic
        console.log("Saving profile:", userInfo);
    };

    const handleSaveApiKey = () => {
        // TODO: Implement API key save logic
        console.log("Saving API key");
    };

    const getUserInitials = () => {
        return userInfo.name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
            {/* Profile Header */}
            <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                    <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />
                    <AvatarFallback className="text-2xl">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Photo
                </Button>
            </div>

            <Separator />

            {/* User Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <User className="h-5 w-5" />
                        User Information
                    </CardTitle>
                    <CardDescription>
                        Manage your personal information
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={userInfo.name}
                            onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                            placeholder="Enter your name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={userInfo.email}
                            onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                            placeholder="Enter your email"
                        />
                    </div>
                    <Button onClick={handleSaveProfile} className="w-full gap-2">
                        <Save className="h-4 w-4" />
                        Save Profile
                    </Button>
                </CardContent>
            </Card>

            {/* API Key Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Key className="h-5 w-5" />
                        API Key
                    </CardTitle>
                    <CardDescription>
                        Configure your OpenAI API key for personalized responses
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <Input
                            id="apiKey"
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="showKey"
                            checked={showApiKey}
                            onChange={(e) => setShowApiKey(e.target.checked)}
                            className="rounded"
                        />
                        <Label htmlFor="showKey" className="text-sm font-normal cursor-pointer">
                            Show API key
                        </Label>
                    </div>
                    <Button onClick={handleSaveApiKey} className="w-full gap-2">
                        <Save className="h-4 w-4" />
                        Save API Key
                    </Button>
                </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Usage Statistics</CardTitle>
                    <CardDescription>
                        Your activity summary
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Conversations</span>
                        <span className="font-semibold">0</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Messages Sent</span>
                        <span className="font-semibold">0</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tools Used</span>
                        <span className="font-semibold">0</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
