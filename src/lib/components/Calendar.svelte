<script module lang="ts">
	export type SlotStatus = 'free' | 'mine' | 'other';
	export type DotsByDate = Record<string, SlotStatus[]>;
</script>

<script lang="ts">
	import { Calendar } from 'bits-ui';
	import { parseDate, type CalendarDate, type DateValue } from '@internationalized/date';

	interface Props {
		date: string;
		minValue?: CalendarDate;
		maxValue?: CalendarDate;
		dots?: DotsByDate;
		slotCount?: number;
	}

	let { date = $bindable(), minValue, maxValue, dots, slotCount }: Props = $props();

	let value: CalendarDate | undefined = $derived(date ? parseDate(date) : undefined);

	let dotLength: number | undefined = $derived.by(() => {
		if (!dots) return undefined;
		const entries = Object.values(dots);
		if (entries.length > 0) return entries[0].length;
		return slotCount;
	});

	const statusColorMap: Record<SlotStatus, string> = {
		free: 'bg-slot-free',
		mine: 'bg-slot-mine',
		other: 'bg-slot-booked'
	};

	function onValueChange(newValue: DateValue | undefined) {
		if (newValue) {
			date = newValue.toString();
		}
	}

	function getDotsForDay(dayStr: string): SlotStatus[] | undefined {
		if (!dots || dotLength === undefined) return undefined;
		return dots[dayStr] ?? Array(dotLength).fill('free' as SlotStatus);
	}
</script>

<div class="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<Calendar.Root
		type="single"
		{value}
		{onValueChange}
		{minValue}
		{maxValue}
		weekdayFormat="short"
		fixedWeeks
		disableDaysOutsideMonth={false}
	>
		{#snippet children({ months, weekdays })}
			<Calendar.Header class="flex items-center justify-between pb-2">
				<Calendar.PrevButton
					class="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
				>
					&lt;
				</Calendar.PrevButton>

				<Calendar.Heading class="text-sm font-semibold" />

				<Calendar.NextButton
					class="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
				>
					&gt;
				</Calendar.NextButton>
			</Calendar.Header>

			{#each months as month (month.value.toString())}
				<Calendar.Grid class="w-full border-collapse">
					<Calendar.GridHead>
						<Calendar.GridRow>
							{#each weekdays as weekday (weekday)}
								<Calendar.HeadCell class="text-center text-xs font-medium text-gray-500">
									{weekday}
								</Calendar.HeadCell>
							{/each}
						</Calendar.GridRow>
					</Calendar.GridHead>

					<Calendar.GridBody>
						{#each month.weeks as week, weekIndex (weekIndex)}
							<Calendar.GridRow>
								{#each week as day (day.toString())}
									<Calendar.Cell date={day} month={month.value} class="p-0">
										<Calendar.Day
											class="inline-flex w-full flex-col items-center justify-center rounded py-1 text-sm
												hover:bg-gray-100
												data-disabled:cursor-not-allowed data-disabled:text-gray-300 data-disabled:hover:bg-transparent
												data-outside-month:text-gray-400 data-selected:bg-blue-600 data-selected:text-white
												data-selected:hover:bg-blue-700
												data-today:font-bold"
										>
											{day.day}
											{#if dots && dotLength && (!minValue || day.compare(minValue) >= 0) && (!maxValue || day.compare(maxValue) <= 0)}
												{@const dayDots = getDotsForDay(day.toString())}
												{#if dayDots}
													<div class="mt-0.5 flex gap-0.5">
														{#each dayDots as status, i (i)}
															<span class="h-1.5 w-1.5 rounded-full {statusColorMap[status]}"
															></span>
														{/each}
													</div>
												{/if}
											{/if}
										</Calendar.Day>
									</Calendar.Cell>
								{/each}
							</Calendar.GridRow>
						{/each}
					</Calendar.GridBody>
				</Calendar.Grid>
			{/each}
		{/snippet}
	</Calendar.Root>
</div>
