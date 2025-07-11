"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	// CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/utils/tailwind";

export function ComboBox({
	data,
	placeholder,
	onChange,
	value,
}: {
	data: { value: string; label: string; icon?: React.ReactNode }[];
	placeholder: string;
	onChange: (value: string) => void;
	value: string;
}) {
	const [open, setOpen] = React.useState(false);

	const selectedItem = data.find((item) => item.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between"
				>
					{selectedItem ? (
						<div className="flex items-center space-x-2 flex-1 overflow-hidden">
							{selectedItem.icon}
							<span className="text-left truncate">{selectedItem.label}</span>
						</div>
					) : (
						<span className="text-muted-foreground">{placeholder}</span>
					)}
					<ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[var(--radix-popover-trigger-width)] p-0"
				style={{ zIndex: 9999 }}
			>
				<Command>
					<CommandList>
						<CommandEmpty>Nenhum item encontrado.</CommandEmpty>
						<CommandGroup>
							{data.map((item) => (
								<CommandItem
									key={item.value}
									value={item.value}
									onSelect={() => {
										onChange(item.value);
										setOpen(false);
									}}
								>
									<div className="flex items-center space-x-2 w-full">
										{item.icon}
										<span className="flex-1 text-left">{item.label}</span>
										<CheckIcon
											className={cn(
												"h-4 w-4",
												value === item.value ? "opacity-100" : "opacity-0",
											)}
										/>
									</div>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
