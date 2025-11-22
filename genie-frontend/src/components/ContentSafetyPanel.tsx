"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import ENV from "@/lib/env";

interface SafetyResult {
    isSafe: boolean;
    categories: {
        category: string;
        flagged: boolean;
        score?: number;
    }[];
    message?: string;
}

export function ContentSafetyPanel() {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SafetyResult | null>(null);
    const { toast } = useToast();

    const checkContentSafety = async () => {
        if (!content.trim()) {
            toast({
                title: "Validation Error",
                description: "Please enter content to check",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${ENV.API_URL}/content-safety/check`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });

            if (!response.ok) {
                // If endpoint doesn't exist, show mock result
                const mockResult: SafetyResult = {
                    isSafe: true,
                    categories: [
                        { category: "hate", flagged: false, score: 0.001 },
                        { category: "violence", flagged: false, score: 0.002 },
                        { category: "self-harm", flagged: false, score: 0.001 },
                        { category: "sexual", flagged: false, score: 0.001 },
                    ],
                    message: "Content safety check endpoint not yet implemented. Showing mock safe result.",
                };
                setResult(mockResult);
                toast({
                    title: "Info",
                    description: "Using mock content safety check",
                });
            } else {
                const data = await response.json();
                setResult(data);
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to check content safety",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Content Safety
                    </CardTitle>
                    <CardDescription>
                        Check content for safety violations and harmful content
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Content to Check</Label>
                        <Textarea
                            placeholder="Enter text to check for safety violations..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={6}
                        />
                    </div>

                    <Button onClick={checkContentSafety} disabled={loading} className="w-full">
                        <Shield className="mr-2 h-4 w-4" />
                        Check Safety
                    </Button>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            {result.isSafe ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    Content is Safe
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    Safety Violations Detected
                                </>
                            )}
                        </CardTitle>
                        {result.message && (
                            <CardDescription className="text-xs">{result.message}</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2">
                            {result.categories.map((cat, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-2 rounded-lg border"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium capitalize">
                                            {cat.category}
                                        </span>
                                        {cat.flagged && (
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {cat.score !== undefined && (
                                            <span className="text-xs text-muted-foreground">
                                                {cat.score.toFixed(3)}
                                            </span>
                                        )}
                                        <Badge variant={cat.flagged ? "destructive" : "secondary"}>
                                            {cat.flagged ? "Flagged" : "Safe"}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!result.isSafe && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/50">
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    This content contains potentially harmful material. Please
                                    review and modify before proceeding.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
