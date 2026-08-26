<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
	label: string;
	canvas: string;
	dimmed?: boolean;
}>();

const swatch = computed(() => ({
	backgroundColor: props.canvas,
	opacity: props.dimmed ? 0.85 : 1,
}));
</script>

<template>
	<li class="card" :class="{ 'card--dimmed': dimmed }">
		<span class="swatch" :style="swatch" :aria-label="`${label} canvas`" />

		<div class="body">
			<strong>{{ label }}</strong>
			<slot name="meta">
				<small>{{ canvas }}</small>
			</slot>
		</div>
	</li>
</template>

<style scoped>
.card {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	border: 1px solid #3a3a3a;
	border-radius: 6px;
}

.card--dimmed {
	border-color: #2a2a2a;
}

.swatch {
	inline-size: 1.5rem;
	block-size: 1.5rem;
	border-radius: 4px;
}
</style>
