/**
 * Character-Weapon associations that define recommended weapons for characters.
 * characterId can be nullable for generic weapon associations.
 * character can be provided by characterId or characterKey.
 * weapon can be provided by weaponId or weaponKey.
 * constellationCondition: Optional minimum constellation level required (null = no requirement)
 */
export const rawCharacterWeapons: Array<{
	characterId?: number | null;
	characterKey?: string;
	weaponId?: number;
	weaponKey?: string;
	constellationCondition?: number | null;
}> = [
	{
		characterKey: "albedo",
		weaponKey: "peak_patrol_song",
	},
	{
		characterKey: "arlecchino",
		weaponKey: "crimson_moons_semblance",
		constellationCondition: 1,
	},
	{
		characterKey: "chasca",
		weaponKey: "astral_vultures_crimson_plumage",
		constellationCondition: 1,
	},
	{
		characterKey: "citlali",
		weaponKey: "starcallers_watch",
	},
	{
		characterKey: "clorinde",
		weaponKey: "absolution",
		constellationCondition: 2,
	},
	{
		characterKey: "columbina",
		weaponKey: "nocturnes_curtain_call",
	},
	{
		characterKey: "durin",
		weaponKey: "athame_artis",
	},
	{
		characterKey: "emilie",
		weaponKey: "lumidouce_elegy",
	},
	{
		characterKey: "escoffier",
		weaponKey: "symphonist_of_scents",
	},
	{
		characterKey: "flins",
		weaponKey: "bloodsoaked_ruins",
	},
	{
		characterKey: "ineffa",
		weaponKey: "fractured_halo",
	},
	{
		characterKey: "kazuha",
		weaponKey: "freedom_sworn",
	},
	{
		characterKey: "kinich",
		weaponKey: "fang_of_the_mountain_king",
	},
	{
		characterKey: "lauma",
		weaponKey: "nightwavers_looking_glass",
	},
	{
		characterKey: "linnea",
		weaponKey: "golden_frostbound_oath",
	},
	{
		characterKey: "mavuika",
		weaponKey: "a_thousand_blazing_suns",
	},
	{
		characterKey: "mualani",
		weaponKey: "surfs_up",
	},
	{
		characterKey: "nefer",
		weaponKey: "reliquary_of_truth",
	},
	{
		characterKey: "neuvillette",
		weaponKey: "tome_of_the_eternal_flow",
		constellationCondition: 1,
	},
	{
		characterKey: "skirk",
		weaponKey: "azurelight",
	},
	{
		characterKey: "varesa",
		weaponKey: "vivid_notions",
	},
	{
		characterKey: "varka",
		weaponKey: "gest_of_the_mighty_wolf",
	},
	{
		characterKey: "venti",
		weaponKey: "the_daybreak_chronicles",
	},
	{
		characterKey: "xilonen",
		weaponKey: "peak_patrol_song",
	},
	{
		characterKey: "zibai",
		weaponKey: "lightbearing_moonshard",
	},
	{
		characterId: null,
		weaponKey: "aquila_favonia",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "summit_shaper",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "skyward_blade",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "wolfs_gravestone",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "song_of_broken_pines",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "skyward_spine",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "amos_bow",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "skyward_harp",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "jadefalls_splendor",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "memory_of_dust",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "skyward_atlas",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "lost_prayer_to_the_sacred_winds",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "everlasting_moonglow",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "vortex_vanquisher",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "skyward_pride",
		constellationCondition: null,
	},
	{
		characterId: null,
		weaponKey: "the_unforged",
		constellationCondition: null,
	},
];
