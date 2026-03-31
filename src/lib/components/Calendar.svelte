<script lang="ts">
	import { Calendar } from 'bits-ui';
	import { parseDate, type CalendarDate, type DateValue } from '@internationalized/date';

	interface Props {
		date: string;
		minValue?: CalendarDate;
		maxValue?: CalendarDate;
	}

	let { date = $bindable(), minValue, maxValue }: Props = $props();

	let value: CalendarDate | undefined = $derived(date ? parseDate(date) : undefined);

	function onValueChange(newValue: DateValue | undefined) {
		if (newValue) {
			date = newValue.toString();
		}
	}
</script>

<div class="inline-block rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<Calendar.Root
		type="single"
		{value}
		{onValueChange}
		{minValue}
		{maxValue}
		weekdayFormat="short"
		fixedWeeks
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
								<Calendar.HeadCell class="w-10 text-center text-xs font-medium text-gray-500">
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
											class="inline-flex h-10 w-10 items-center justify-center rounded text-sm
												hover:bg-gray-100
												data-disabled:cursor-not-allowed data-disabled:text-gray-300 data-disabled:hover:bg-transparent
												data-outside-month:text-gray-400 data-selected:bg-blue-600 data-selected:text-white
												data-selected:hover:bg-blue-700
												data-today:font-bold"
										>
											{day.day}
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
