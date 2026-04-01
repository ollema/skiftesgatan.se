<script module lang="ts">
	export type SlotStatus = 'free' | 'mine' | 'other';
	export type DotsByDate = Record<string, SlotStatus[]>;
</script>

<script lang="ts">
	import { Calendar } from 'bits-ui';
	import { DateFormatter, type CalendarDate, type DateValue } from '@internationalized/date';
	import { TIMEZONE } from '$lib/types/bookings';

	const monthFormatter = new DateFormatter('sv-SE', { month: 'long', timeZone: TIMEZONE });

	interface Props {
		date: CalendarDate;
		minValue?: CalendarDate;
		maxValue?: CalendarDate;
		dots?: DotsByDate;
		slotCount?: number;
	}

	let { date = $bindable(), minValue, maxValue, dots, slotCount }: Props = $props();

	let dotLength: number | undefined = $derived.by(() => {
		if (!dots) return undefined;
		const entries = Object.values(dots);
		if (entries.length > 0) return entries[0].length;
		return slotCount;
	});

	const statusColorMap: Record<SlotStatus, string> = {
		free: 'border border-border',
		mine: 'bg-slot-mine',
		other: 'bg-slot-occupied'
	};

	function onValueChange(newValue: DateValue | undefined) {
		if (newValue) {
			date = newValue as CalendarDate;
		}
	}

	function getDotsForDay(dayStr: string): SlotStatus[] | undefined {
		if (!dots || dotLength === undefined) return undefined;
		return dots[dayStr] ?? Array(dotLength).fill('free' as SlotStatus);
	}
</script>

<div class="w-full">
	<Calendar.Root
		type="single"
		value={date}
		{onValueChange}
		{minValue}
		{maxValue}
		locale="sv-SE"
		weekdayFormat="short"
		fixedWeeks
		disableDaysOutsideMonth={false}
	>
		{#snippet children({ months, weekdays })}
			<Calendar.Header class="flex items-center justify-center gap-1 pb-2">
				<Calendar.PrevButton
					class="inline-flex size-8 items-center justify-center transition-colors duration-120 hover:bg-bg-alt"
				>
					&lt;
				</Calendar.PrevButton>

				<Calendar.Heading class="w-[10ch] text-center font-heading text-sm font-normal">
					{monthFormatter.format(months[0].value.toDate(TIMEZONE))}
				</Calendar.Heading>

				<Calendar.NextButton
					class="inline-flex size-8 items-center justify-center transition-colors duration-120 hover:bg-bg-alt"
				>
					&gt;
				</Calendar.NextButton>
			</Calendar.Header>

			{#each months as month (month.value.toString())}
				<Calendar.Grid class="grid w-full grid-cols-7">
					<Calendar.GridHead class="contents">
						<Calendar.GridRow class="contents">
							{#each weekdays as weekday (weekday)}
								<Calendar.HeadCell class="text-center text-xs font-normal text-text-muted">
									{weekday}
								</Calendar.HeadCell>
							{/each}
						</Calendar.GridRow>
					</Calendar.GridHead>

					<Calendar.GridBody class="contents">
						{#each month.weeks as week, weekIndex (weekIndex)}
							<Calendar.GridRow class="contents">
								{#each week as day (day.toString())}
									<Calendar.Cell date={day} month={month.value} class="p-0">
										<Calendar.Day
											class="inline-flex w-full flex-col items-center justify-center py-1 text-sm hover:bg-bg-alt
												data-disabled:cursor-not-allowed
												data-disabled:text-border data-disabled:hover:bg-transparent data-outside-month:text-text-muted
												data-selected:ring-2 data-selected:ring-text-primary/20 data-selected:ring-inset data-today:font-semibold
												sm:py-2.5"
										>
											{day.day}
											{#if dots && dotLength}
												{@const inRange =
													(!minValue || day.compare(minValue) >= 0) &&
													(!maxValue || day.compare(maxValue) <= 0)}
												{@const dayDots = inRange ? getDotsForDay(day.toString()) : undefined}
												{@const fallbackDots: SlotStatus[] = Array(dotLength).fill('free')}
												<div class="mt-0.5 flex gap-0.5" class:invisible={!dayDots}>
													{#each dayDots ?? fallbackDots as status, i (i)}
														<span class="box-border size-1.5 {statusColorMap[status]}"></span>
													{/each}
												</div>
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
