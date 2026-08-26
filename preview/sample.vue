<script setup lang="ts">
import { computed, ref } from "vue";
import VariantCard from "./VariantCard.vue";

/** Which way a variant's greys lean off neutral. */
type Cast = "cool" | "neutral" | "warm";

interface Variant {
	label: string;
	cast: Cast;
	canvas: string;
	ratio: number;
}

const props = withDefaults(defineProps<{ minRatio?: number }>(), {
	minRatio: 4.5,
});

const emit = defineEmits<{ pick: [variant: Variant] }>();

const variants = ref<Variant[]>([
	{ label: "Ember Black", cast: "neutral", canvas: "#000000", ratio: 18.0 },
	{ label: "Ember Ink", cast: "cool", canvas: "#151616", ratio: 12.17 },
	{ label: "Ember Slate", cast: "cool", canvas: "#1c1d1e", ratio: 12.25 },
]);

const passing = computed(() =>
	variants.value.filter((variant) => variant.ratio >= props.minRatio),
);
</script>

<template>
	<section class="ramp">
		<h2>Ember ramp — {{ passing.length }} of {{ variants.length }} pass</h2>

		<p v-if="!passing.length" class="empty">Nothing clears {{ minRatio }}:1.</p>

		<ul v-else>
			<VariantCard
				v-for="variant in passing"
				:key="variant.label"
				:label="variant.label"
				:canvas="variant.canvas"
				:dimmed="variant.cast === 'cool'"
				@click="emit('pick', variant)"
			>
				<template #meta>
					<small>{{ variant.ratio.toFixed(2) }}:1</small>
				</template>
			</VariantCard>
		</ul>
	</section>
</template>

<style scoped>
.ramp {
	--gap: 0.75rem;
	display: flex;
	flex-direction: column;
	gap: var(--gap);
	color: #f0f0f0;
}

.ramp h2::after {
	content: " ✦";
	color: #d97757;
}

.empty {
	opacity: 0.6;
	font-style: italic;
}

@media (min-width: 768px) {
	.ramp ul {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--gap);
	}
}
</style>
