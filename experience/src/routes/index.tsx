import { createFileRoute } from "@tanstack/react-router";
import { DiscoverPage } from '@/components/discovery';
import { pageHead } from '@/lib/beat-drop';
export const Route = createFileRoute("/")({
  head: () => pageHead('Discover your sound', 'Four strangers. One beat. Everyone credited. Discover BEAT DROP, a collaborative music playground powered by Monad.'),
  component: DiscoverPage,
});
