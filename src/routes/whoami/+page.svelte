<script lang="ts">
	let { data } = $props();
</script>

<main class="mx-auto max-w-2xl px-5 py-10 font-mono text-sm">
	<h1 class="mb-4 font-display text-3xl font-bold uppercase">Whoami</h1>

	<p class="mb-6 text-muted">
		Copy <code>sub</code> below and set it as the <code>OWNER_SUB</code> secret, then delete this
		route.
	</p>

	<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
		<dt class="text-muted">sub</dt>
		<dd class="break-all select-all">{data.user.sub}</dd>
		<dt class="text-muted">email</dt>
		<dd class="break-all">{data.user.email}</dd>
		<dt class="text-muted">isOwner</dt>
		<dd>{data.user.isOwner}</dd>
	</dl>
</main>
