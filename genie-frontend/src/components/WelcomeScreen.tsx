import { Card, CardContent } from "./ui/card";
import { AgenticaIcon } from "./icons";
import type { FC } from "react";

export const examplePrompts = [
	{
		icon: "GitBranch",
		text: "Explain your composable architecture",
	},
	{
		icon: "Share2",
		text: "How do you handle real-time UI integration?",
	},
	{
		icon: "ToyBrick",
		text: "What is the AGUI Protocol and why is it useful?",
	},
];

interface WelcomeScreenProps {
	onExamplePrompt: (prompt: string) => void;
}

export const WelcomeScreen: FC<WelcomeScreenProps> = ({ onExamplePrompt }) => (
	<div className="flex h-full flex-col items-center justify-center py-12 text-center">
		<div className="rounded-full border-8 border-background bg-primary/10 p-4 shadow-lg">
			<AgenticaIcon className="size-12 text-primary drop-shadow-[0_2px_4px_hsl(var(--primary)/0.4)]" />
		</div>
		<h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
			Agentica AI
		</h1>
		<p className="mt-2 max-w-lg text-md text-muted-foreground">
			Your expert assistant for building agentic applications.
		</p>
		<div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
			{examplePrompts.map((prompt, i) => (
				<Card
					key={prompt.text}
					className="group cursor-pointer transition-colors hover:bg-secondary"
					onClick={() => onExamplePrompt(prompt.text)}
				>
					<CardContent className="flex items-center gap-3 p-3">
						<div className="rounded-md bg-primary/10 p-1.5 transition-colors group-hover:bg-primary/20">
							{/* Replace with dynamic icon import if needed */}
							{/* <prompt.icon className="size-5 text-primary" /> */}
						</div>
						<p className="text-left text-sm font-medium">{prompt.text}</p>
					</CardContent>
				</Card>
			))}
		</div>
	</div>
);
