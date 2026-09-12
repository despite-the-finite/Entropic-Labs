/* Entropic Labs — Observatory catalogue.
   ==========================================================================
   This is the whole content layer. Nothing here knows how it will be drawn.
   To add an observation, append an object to OBSERVATIONS below; to add a
   whole area of curiosity, append to CATEGORIES. Neither the star map nor
   the record view needs editing.

   CATEGORY
     id        slug, also the URL hash (observatory.html#lost-civilizations)
     name      shown on the map and in the catalogue
     line      one-line description, shown on hover / in the catalogue header
     pos       {x, y} in sky space. Roughly -1.4..1.4 by -0.95..0.95. The
               renderer rescales for portrait screens, so treat these as a
               composition, not pixels.
     spread    radius its observations are scattered over. Optional (0.3).
     magnitude relative brightness of the category star, 0.6..1.3. Optional.

   OBSERVATION
     id        'OBS-0047'. The number is the catalogue designation shown on
               the record; gaps in the sequence are intentional.
     title     record title
     category  a CATEGORY id
     status    CONFIRMED | ONGOING | CONTESTED | UNRESOLVED | UNCLASSIFIED
               (drives the colour of the status pip — see STATUS_TONE)
     detected  when it entered the record. Free text.
     location  where. Free text, or null to omit the row.
     age       how old the thing itself is. Free text, or null.
     summary   array of paragraphs.
     whyItMatters  one paragraph. Required — it is the point of the record.
     certainty array of {label, text}. Label should be one of ESTABLISHED,
               HYPOTHESIS, UNRESOLVED, SPECULATION so a reader can always
               tell which is which. This is the honest core of the archive.
     related   array of observation ids.
     sources   array of {label, url}. Labels carry the full citation; URLs
               point at the publishing institution rather than a deep link,
               so they keep working.
     pos       optional {x, y} offset from the category star. Omit and the
               renderer places it on a deterministic spiral.
     image     optional {src, alt}. Nothing uses one yet.
     special   optional behaviour key. Only 'anomaly' is handled today.
   ========================================================================== */

(function (global) {
  'use strict';

  var CATEGORIES = [
    {
      id: 'universe',
      name: 'The Universe',
      line: 'The largest available object, and the least finished description of it.',
      pos: { x: -1.00, y: -0.44 },
      spread: 0.34,
      magnitude: 1.25
    },
    {
      id: 'human-origins',
      name: 'Human Origins',
      line: 'How many ways there have been of being a person.',
      pos: { x: -0.14, y: -0.66 },
      spread: 0.26,
      magnitude: 1.0
    },
    {
      id: 'lost-civilizations',
      name: 'Lost Civilizations',
      line: 'Places that were busy for centuries and then were not.',
      pos: { x: 0.40, y: -0.20 },
      spread: 0.30,
      magnitude: 1.15
    },
    {
      id: 'life',
      name: 'Life',
      line: 'The chemistry that refused to settle down.',
      pos: { x: -0.50, y: -0.02 },
      spread: 0.26,
      magnitude: 1.05
    },
    {
      id: 'deep-time',
      name: 'Deep Time',
      line: 'Intervals long enough to make the planet unrecognisable.',
      pos: { x: -0.62, y: 0.40 },
      spread: 0.26,
      magnitude: 0.95
    },
    {
      id: 'animal-intelligence',
      name: 'Animal Intelligence',
      line: 'Minds that arrived at thinking by another road.',
      pos: { x: 0.72, y: 0.62 },
      spread: 0.26,
      magnitude: 1.0
    },
    {
      id: 'quantum-reality',
      name: 'Quantum Reality',
      line: 'The layer underneath, which declines to behave like the one above.',
      pos: { x: 0.94, y: -0.58 },
      spread: 0.26,
      magnitude: 0.9
    },
    {
      id: 'earth',
      name: 'Earth',
      line: 'The only confirmed habitable planet, still largely unsurveyed.',
      pos: { x: 0.02, y: 0.30 },
      spread: 0.26,
      magnitude: 1.1
    },
    {
      id: 'technology',
      name: 'Technology',
      line: 'Things people built that we cannot entirely account for.',
      pos: { x: 1.10, y: 0.02 },
      spread: 0.24,
      magnitude: 0.9
    },
    {
      id: 'the-unknown',
      name: 'The Unknown',
      line: 'Recorded once, explained never.',
      pos: { x: -1.10, y: 0.72 },
      spread: 0.26,
      magnitude: 1.2
    }
  ];

  var OBSERVATIONS = [

    /* ---------------------------------------------------------------- DEEP TIME */
    {
      id: 'OBS-0002',
      title: 'The Jack Hills Zircons',
      category: 'deep-time',
      status: 'CONFIRMED',
      detected: '2001',
      location: 'Narryer Gneiss Terrane, Western Australia',
      age: '4.4 billion years',
      summary: [
        'Embedded in a ridge of Australian sandstone are grains of zircon a fraction of a millimetre across. Zircon is stubborn: it survives the destruction of the rock that made it, and it locks uranium into its structure while excluding lead, which turns each grain into a clock that has been running since it crystallised. The oldest grains recovered from the Jack Hills date to about 4.4 billion years ago — roughly 150 million years after the Earth itself formed, and older than any surviving rock.',
        'The grains are not just old. Their oxygen isotope ratios indicate that the magma they crystallised from had interacted with liquid water near the surface at relatively low temperature. Something wet was already happening on a planet that had barely finished assembling.'
      ],
      whyItMatters: 'The Hadean — Earth\'s first eon — was named for hell, and pictured as an ocean of magma under constant bombardment for half a billion years. These grains are physical evidence that the picture is at least partly wrong: there was liquid water, and a crust for it to sit on, almost immediately. The window in which life could have started is far wider than it looked, which changes the odds on every rocky planet we will ever find.',
      certainty: [
        { label: 'ESTABLISHED', text: 'The ages are measured by uranium–lead dating on individual grains and have been reproduced across many laboratories. These are the oldest known fragments of the Earth.' },
        { label: 'HYPOTHESIS', text: 'The "cool early Earth" reading of the oxygen isotopes — surface water and a solid crust by 4.4 billion years ago — is well supported but relies on inference from a small mineral, not from surviving rock.' },
        { label: 'CONTESTED', text: 'A 2015 report of carbon inclusions of possibly biological origin in a 4.1-billion-year-old grain remains disputed; contamination and non-biological origins have not been excluded.' }
      ],
      related: ['OBS-0006', 'OBS-0009'],
      sources: [
        { label: 'Wilde, Valley, Peck & Graham, "Evidence from detrital zircons for the existence of continental crust and oceans on the Earth 4.4 Gyr ago", Nature (2001)', url: 'https://www.nature.com/' },
        { label: 'WiscSIMS / Department of Geoscience, University of Wisconsin–Madison', url: 'https://www.wisc.edu/' }
      ]
    },
    {
      id: 'OBS-0006',
      title: 'The Great Oxidation Event',
      category: 'deep-time',
      status: 'CONFIRMED',
      detected: 'Recognised through the 20th century',
      location: 'Global',
      age: '~2.4 billion years ago',
      summary: [
        'For most of its first two billion years the Earth had essentially no free oxygen in its air. Cyanobacteria had worked out oxygenic photosynthesis, but the oxygen they released was consumed as fast as it was made — by dissolved iron in the oceans, by volcanic gases, by rock. The iron precipitated out in vast banded layers that are still mined today.',
        'Then the sinks filled. Beginning around 2.4 billion years ago free oxygen accumulated in the atmosphere for the first time and stayed there. It was the largest chemical change in the planet\'s history, and it was pollution: a waste product from one lineage of microbes, altering the entire atmosphere and, in all likelihood, poisoning most of the life that existed at the time.'
      ],
      whyItMatters: 'Every animal alive runs on the exhaust of that event. It is also the clearest case we have of life not merely adapting to a planet but rewriting it — which is exactly the signature we would look for in an atmosphere orbiting another star. Whatever a biosignature is, this is what one looks like from the inside.',
      certainty: [
        { label: 'ESTABLISHED', text: 'The rise of atmospheric oxygen around 2.4 billion years ago is recorded independently in sulphur isotope chemistry, banded iron formations, and the disappearance of minerals that cannot survive in an oxygen-bearing atmosphere.' },
        { label: 'HYPOTHESIS', text: 'The link between the oxidation event and the Huronian glaciations — oxygen destroying an atmospheric methane greenhouse and freezing the planet — is plausible and widely held, but the sequence and timing are still argued.' },
        { label: 'UNRESOLVED', text: 'When oxygenic photosynthesis actually evolved. Traces of transient oxygen ("whiffs") appear in rocks hundreds of millions of years older, so the ability may long predate the atmospheric change.' }
      ],
      related: ['OBS-0002', 'OBS-0009', 'OBS-0019'],
      sources: [
        { label: 'Lyons, Reinhard & Planavsky, "The rise of oxygen in Earth\'s early ocean and atmosphere", Nature (2014)', url: 'https://www.nature.com/' },
        { label: 'NASA Astrobiology Program', url: 'https://astrobiology.nasa.gov/' }
      ]
    },

    /* -------------------------------------------------------------------- EARTH */
    {
      id: 'OBS-0009',
      title: 'The Deep Biosphere',
      category: 'earth',
      status: 'ONGOING',
      detected: 'Established through the 1990s–2020s',
      location: 'Continental and oceanic crust, worldwide',
      age: 'Continuously inhabited for at least hundreds of millions of years',
      summary: [
        'Below the soil, below the water table, below the deepest mine, there is life in the rock. Drilling programmes on land and at sea have found microbial communities kilometres down, in fractured basalt, in sediments, in coal beds buried under the seafloor. They are not contamination and they are not rare.',
        'They also live at a speed that barely registers as living. Deprived of sunlight, many draw energy from chemical reactions with the rock itself, and their metabolic rates imply generation times measured in centuries or millennia. In 2020 researchers revived microbes from seabed sediment about 101 million years old — organisms that had been sitting in the dark, effectively idling, since the Cretaceous.'
      ],
      whyItMatters: 'The Deep Carbon Observatory estimated that the subsurface may hold most of the Earth\'s bacteria and archaea, and a carbon mass hundreds of times that of all humans combined. The largest habitat on the planet is one we have essentially never visited, and the life in it operates on timescales for which our word "alive" was not designed. It also relocates the search for life elsewhere: a planet does not need a pleasant surface, only a wet, warm crust.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Microbial life exists throughout the continental and oceanic subsurface, confirmed by scientific drilling with contamination controls, and by direct culture and revival of the organisms recovered.' },
        { label: 'HYPOTHESIS', text: 'Estimates of total subsurface biomass and cell counts are extrapolations from a small number of boreholes across an enormous volume, and carry wide error bars.' },
        { label: 'UNRESOLVED', text: 'Whether the slowest of these communities are metabolising, repairing, and reproducing on millennial cycles, or persisting in some state our categories do not cleanly cover.' }
      ],
      related: ['OBS-0014', 'OBS-0006', 'OBS-0019'],
      sources: [
        { label: 'Deep Carbon Observatory, "Life in Deep Earth" synthesis (2018)', url: 'https://deepcarbon.net/' },
        { label: 'Morono et al., "Aerobic microbial life persists in oxic marine sediment as old as 101.5 million years", Nature Communications (2020)', url: 'https://www.nature.com/ncomms/' },
        { label: 'Japan Agency for Marine-Earth Science and Technology (JAMSTEC)', url: 'https://www.jamstec.go.jp/e/' }
      ]
    },
    {
      id: 'OBS-0031',
      title: 'The Green Sahara',
      category: 'earth',
      status: 'CONFIRMED',
      detected: 'Rock art recorded from the 1930s; palaeoclimate record from the 1970s',
      location: 'North Africa',
      age: 'Roughly 11,000–5,000 years ago',
      summary: [
        'On the walls of the Tassili n\'Ajjer plateau in Algeria, and in a cave in the Gilf Kebir on the Egyptian–Libyan border, there are paintings of cattle herds, giraffes, hippopotamus, and human figures that appear to be swimming. They were painted in what is now some of the driest terrain on Earth.',
        'The paintings are accurate. Between roughly eleven and five thousand years ago the Sahara was grassland and wooded savannah, threaded with rivers and holding lakes — Lake Mega-Chad alone was larger than any freshwater lake alive today. The cause was orbital: a slow precession of the Earth\'s axis increased northern summer sunlight, pulled the West African monsoon far north of its present limit, and kept it there for thousands of years. Then the orbit moved on, the rains retreated, and the people and cattle went with them.'
      ],
      whyItMatters: 'This is the clearest demonstration that the map is temporary. A region we treat as a permanent feature of the world was green within the span of human civilisation, and will likely be green again in roughly fifteen thousand years, on a cycle driven by nothing more than the wobble of the planet. It also reframes the Nile valley: Egypt may be, in part, what happened when the Sahara emptied and its population concentrated along the only river left.',
      certainty: [
        { label: 'ESTABLISHED', text: 'The African Humid Period is recorded in lake sediments, marine dust cores, pollen records, fossil river channels visible from orbit, cemeteries such as Gobero in Niger, and the rock art itself.' },
        { label: 'HYPOTHESIS', text: 'Orbital precession as the primary driver is well supported by climate modelling, but the strength of feedbacks from vegetation and dust is still being quantified.' },
        { label: 'UNRESOLVED', text: 'Whether the ending was abrupt — a threshold crossed within centuries — or a long gradual drying, and how much overgrazing by human herds contributed. The sediment records disagree with each other.' }
      ],
      related: ['OBS-0036', 'OBS-0041', 'OBS-0006'],
      sources: [
        { label: 'deMenocal et al., "Abrupt onset and termination of the African Humid Period", Quaternary Science Reviews (2000)', url: 'https://www.sciencedirect.com/' },
        { label: 'UNESCO World Heritage Centre — Tassili n\'Ajjer', url: 'https://whc.unesco.org/' }
      ]
    },

    /* --------------------------------------------------------------------- LIFE */
    {
      id: 'OBS-0014',
      title: 'Tardigrades',
      category: 'life',
      status: 'CONFIRMED',
      detected: 'Described 1773; space exposure experiment 2007',
      location: 'Every continent, from deep sea to mountain moss',
      age: 'Lineage dates to at least the Cambrian',
      summary: [
        'A tardigrade is under a millimetre long, has eight legs, and moves like a very slow bear. Dry one out and it does something remarkable: it withdraws its legs, loses nearly all its body water, replaces it with protective sugars and proteins, and contracts into a barrel called a tun. Metabolism falls to a fraction of a percent of normal, or stops altogether within the limits of measurement.',
        'In that state it has survived being carried into low Earth orbit and exposed directly to the vacuum of space and to unfiltered solar ultraviolet, and rehydrated afterwards. It tolerates radiation doses that would be lethal to us many times over, in part through a protein that binds to and shields its DNA. What it does not do is any of this while awake — a hydrated, active tardigrade is a soft, ordinary and easily killed animal.'
      ],
      whyItMatters: 'Cryptobiosis breaks the assumed link between being alive and doing anything. An organism can suspend the process entirely and resume it years later, which means life is a state a system can leave and re-enter rather than a fire that must be kept burning. That has direct consequences for how we think about dormancy, for the preservation of biological material, and for whether something could plausibly survive a journey between worlds.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Survival of vacuum and solar UV in low Earth orbit was demonstrated by a controlled experiment aboard a European recoverable satellite in 2007. Extreme radiation and desiccation tolerance in the tun state is reproducible in the laboratory.' },
        { label: 'ESTABLISHED', text: 'Tardigrades are not indestructible. Their tolerances apply to the dehydrated tun; sustained warming kills them, and their reputation is routinely overstated.' },
        { label: 'UNRESOLVED', text: 'Whether metabolism truly halts in the tun state or merely falls below the detection limit of current instruments — a distinction that matters more than it sounds.' }
      ],
      related: ['OBS-0009', 'OBS-0019'],
      sources: [
        { label: 'Jönsson et al., "Tardigrades survive exposure to space in low Earth orbit", Current Biology (2008)', url: 'https://www.cell.com/current-biology/home' },
        { label: 'Hashimoto et al., "Extremotolerant tardigrade genome and improved radiotolerance of human cultured cells by tardigrade-unique protein", Nature Communications (2016)', url: 'https://www.nature.com/ncomms/' },
        { label: 'Natural History Museum, London', url: 'https://www.nhm.ac.uk/' }
      ]
    },
    {
      id: 'OBS-0019',
      title: 'The Mycorrhizal Network',
      category: 'life',
      status: 'CONTESTED',
      detected: 'Symbiosis known since the 1880s; forest network claims from 1997',
      location: 'Soil, effectively everywhere plants grow',
      age: 'At least 400 million years',
      summary: [
        'Almost all land plants trade with fungi. The fungus threads its filaments into or around the roots, supplies water and mineral nutrients drawn from a volume of soil the root could never reach, and takes sugar in return. The arrangement is ancient — it appears in the oldest well-preserved land plant fossils — and it is likely to be one of the things that made land habitable for plants at all.',
        'The far more famous claim is that these fungi wire whole forests together into a communicating network, through which mature trees deliberately feed their own seedlings and warn neighbours of attack. A 2023 review in Nature Ecology & Evolution examined that story carefully and found the evidence thin: common networks are less well documented in real forests than assumed, resource transfer through them is rarely shown to benefit the receiving seedling, and the claim about trees favouring kin rests on very few studies. The reviewers traced how each claim had grown more confident with every citation.'
      ],
      whyItMatters: 'The underground symbiosis is real, old, and enormous, and it deserves the attention. But this record is kept partly as a caution: the "wood wide web" is the clearest recent case of a beautiful idea outrunning its data in public, and the correction is a better piece of science than the original story. Wondering about something includes noticing when we have started believing it too easily.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Mycorrhizal symbiosis between fungi and plant roots is universal, ancient, and essential to most terrestrial ecosystems. Individual fungal genets can be vast: an Armillaria in eastern Oregon covers roughly nine square kilometres.' },
        { label: 'ESTABLISHED', text: 'Carbon can move between plants through fungal connections under experimental conditions.' },
        { label: 'CONTESTED', text: 'That common mycorrhizal networks are widespread in forests, that they meaningfully aid seedling growth, and that mature trees preferentially direct resources to kin. All three are popularly reported as settled and are not.' }
      ],
      related: ['OBS-0009', 'OBS-0006'],
      sources: [
        { label: 'Karst, Jones & Hoeksema, "Positive citation bias and overinterpreted results lead to misinformation on common mycorrhizal networks in forests", Nature Ecology & Evolution (2023)', url: 'https://www.nature.com/natecolevol/' },
        { label: 'Simard et al., "Net transfer of carbon between ectomycorrhizal tree species in the field", Nature (1997)', url: 'https://www.nature.com/' },
        { label: 'USDA Forest Service — Malheur National Forest', url: 'https://www.fs.usda.gov/' }
      ]
    },

    /* ------------------------------------------------------- ANIMAL INTELLIGENCE */
    {
      id: 'OBS-0023',
      title: 'Octopus Cognition',
      category: 'animal-intelligence',
      status: 'ONGOING',
      detected: 'Under systematic study since the 1950s',
      location: 'All oceans',
      age: 'Diverged from our lineage more than 550 million years ago',
      summary: [
        'An octopus has around half a billion neurons, comparable to a dog. Roughly two-thirds of them are not in its brain but distributed along its arms, which carry enough local processing to explore, grip, and solve small problems without central instruction. It is not obvious where the animal ends and its limbs\' own judgement begins.',
        'Behaviourally they open containers, navigate mazes, recognise individual human keepers, and — in the case of a veined octopus in Indonesia — carry halved coconut shells across open seabed to assemble into shelter later, which meets most definitions of tool use. Cephalopods also edit their own RNA on a scale seen nowhere else, recoding protein instructions on the fly, particularly in nervous tissue.',
        'What makes them strange rather than merely clever is the distance. Our last common ancestor was something like a flatworm more than half a billion years ago. Whatever an octopus is doing, it is not a variation on our solution. It is a second, independent one.'
      ],
      whyItMatters: 'Every other intelligent animal we know is a relative — a primate, a cetacean, a bird. The octopus is the only case where complex, flexible, apparently curious behaviour arose on a nervous system built to a completely different plan. It is the closest thing to an alien intelligence that we can actually pick up and study, and it is the strongest available evidence that minds are not a single accident but something reachable by more than one route.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Neuron counts and their distribution, extensive RNA recoding in coleoid cephalopods, tool use in Amphioctopus marginatus, and problem-solving and individual recognition in captivity are all documented in peer-reviewed work.' },
        { label: 'HYPOTHESIS', text: 'That heavy RNA editing represents a trade-off — flexibility in the nervous system at the cost of genomic evolutionary rate — is a leading interpretation, not a settled result.' },
        { label: 'UNRESOLVED', text: 'Whether there is subjective experience, and if so whether it is unified or distributed among the arms. A UK government-commissioned review in 2021 found the evidence for cephalopod sentience strong enough to change the law; it did not, and could not, answer what it is like to be one.' }
      ],
      related: ['OBS-0027', 'OBS-0079'],
      sources: [
        { label: 'Finn, Tregenza & Norman, "Defensive tool use in a coconut-carrying octopus", Current Biology (2009)', url: 'https://www.cell.com/current-biology/home' },
        { label: 'Liscovitch-Brauer et al., "Trade-off between transcriptome plasticity and genome evolution in cephalopods", Cell (2017)', url: 'https://www.cell.com/' },
        { label: 'Birch et al., "Review of the Evidence of Sentience in Cephalopod Molluscs and Decapod Crustaceans", LSE (2021)', url: 'https://www.lse.ac.uk/' }
      ]
    },
    {
      id: 'OBS-0027',
      title: 'Corvid Tool Manufacture',
      category: 'animal-intelligence',
      status: 'CONFIRMED',
      detected: '1996',
      location: 'New Caledonia; laboratories worldwide',
      age: 'Corvid lineage diverged from mammals ~320 million years ago',
      summary: [
        'New Caledonian crows do not merely use tools, they make them. In the wild they cut hooks from twigs and manufacture stepped, barbed probes from the stiff edges of Pandanus leaves, then use them to extract grubs from dead wood. The designs vary regionally and the birds are fussy about them.',
        'Under test the family goes further. Western scrub-jays remember what they cached, where, and how long ago, and will re-hide food if they were watched while caching — but only if they have themselves stolen from another bird before, which looks uncomfortably like projecting their own experience onto a rival. Ravens select and save a tool for a task they will not be offered for another fifteen hours. Crows solve multi-stage puzzles requiring a tool to obtain a tool.',
        'They do this without a neocortex. Bird brains are organised entirely differently from mammal brains, and pack neurons far more densely — a corvid can carry as many pallial neurons as a monkey in a skull a fraction of the size.'
      ],
      whyItMatters: 'Birds and mammals last shared an ancestor around 320 million years ago, and that ancestor had nothing resembling either brain. Planning, self-recognition of a kind, and tool manufacture therefore evolved at least twice, on two unrelated pieces of hardware. Intelligence is not one lucky architecture. It is something evolution keeps arriving at.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Tool manufacture in wild New Caledonian crows, episodic-like memory and re-caching in scrub-jays, planning for future tool use in ravens, and the high neuron density of the corvid pallium are all replicated findings.' },
        { label: 'HYPOTHESIS', text: 'That re-caching after being observed reflects perspective-taking rather than a simpler behavioural rule remains debated, though the "only if they have stolen themselves" result is difficult to explain otherwise.' },
        { label: 'UNRESOLVED', text: 'Whether corvids have conscious experience. A 2020 study reported neural activity in crows correlating with reported perception rather than with the stimulus — suggestive, and far from conclusive.' }
      ],
      related: ['OBS-0023', 'OBS-0079'],
      sources: [
        { label: 'Hunt, "Manufacture and use of hook-tools by New Caledonian crows", Nature (1996)', url: 'https://www.nature.com/' },
        { label: 'Clayton & Dickinson, "Episodic-like memory during cache recovery by scrub jays", Nature (1998)', url: 'https://www.nature.com/' },
        { label: 'Kabadayi & Osvath, "Ravens parallel great apes in flexible planning for tool-use and bartering", Science (2017)', url: 'https://www.science.org/' }
      ]
    },

    /* ------------------------------------------------------- LOST CIVILIZATIONS */
    {
      id: 'OBS-0036',
      title: 'Doggerland',
      category: 'lost-civilizations',
      status: 'CONFIRMED',
      detected: 'Trawled finds from the 1930s; systematically mapped from 2007',
      location: 'Southern North Sea',
      age: 'Inhabited until roughly 6000 BCE',
      summary: [
        'Between Britain and the Netherlands there is a shallow stretch of sea that was, until about eight thousand years ago, the best land in the region: a low plain of rivers, lakes, reed marsh and woodland, full of game, with a long coastline. Mesolithic people lived there for thousands of years. It was not a bridge people crossed. It was where they were going.',
        'North Sea trawlers have been dragging up its remains for a century — mammoth and lion bones, worked flint, a barbed antler point, a fragment of Neanderthal skull from an earlier period entirely. Since 2007 a project at the University of Bradford has reconstructed the landscape from oil-industry seismic survey data and sediment DNA, mapping river valleys and coastlines nobody has seen.',
        'It drowned slowly as the ice sheets melted, and then, around 8,150 years ago, a submarine landslide off the Norwegian shelf sent a tsunami across what was left of it.'
      ],
      whyItMatters: 'Sea level at the last glacial maximum was well over a hundred metres lower than today, so every coastline in the world was somewhere else. Doggerland is the best-mapped example of an entire inhabited landscape that is now underwater — and the reminder that the archaeology of the period is systematically biased, because we have thoroughly excavated the highlands and barely touched the lowlands where people actually preferred to live.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Doggerland existed, was inhabited, and was progressively submerged by post-glacial sea level rise. This is confirmed by dated artefacts and faunal remains, seismic mapping of its topography, and sedimentary ancient DNA.' },
        { label: 'ESTABLISHED', text: 'The Storegga Slide off Norway generated a tsunami around 8,150 years ago; its deposits have been identified in North Sea sediment cores.' },
        { label: 'UNRESOLVED', text: 'Whether the tsunami finished Doggerland or struck an already fragmenting archipelago, and how many people were there when it did.' }
      ],
      related: ['OBS-0031', 'OBS-0041', 'OBS-0047'],
      sources: [
        { label: 'Gaffney et al., Europe\'s Lost Frontiers project, University of Bradford', url: 'https://www.bradford.ac.uk/' },
        { label: 'Walker et al., "A great wave: the Storegga tsunami and the end of Doggerland?", Antiquity (2020)', url: 'https://www.cambridge.org/core/journals/antiquity' }
      ]
    },
    {
      id: 'OBS-0041',
      title: 'Göbekli Tepe',
      category: 'lost-civilizations',
      status: 'ONGOING',
      detected: 'Surveyed 1963; excavation began 1995',
      location: 'Şanlıurfa Province, southeastern Türkiye',
      age: '~11,500 years',
      summary: [
        'On a limestone ridge in southeastern Anatolia, people who had no pottery, no metal, no writing and no clearly domesticated crops quarried T-shaped pillars up to five and a half metres tall and weighing several tonnes, carved them with foxes, boars, snakes, scorpions, vultures and cranes, and set them in rings. Then, over centuries, they built more, and eventually buried the whole thing.',
        'The dates run from roughly 9500 to 8000 BCE. That is around six thousand years before Stonehenge and before the first cities of Mesopotamia — built by people conventionally described as hunter-gatherers, using organised labour on a scale nobody had credited them with.',
        'The original excavator, Klaus Schmidt, read it as a sanctuary: ritual first, agriculture afterwards, with the demand for feasting the crowds driving the domestication of grain. That reading is now under revision by the people who took over the site. Continuing excavation has found domestic architecture, water cisterns, and evidence of everyday occupation, and nearby sites such as Karahan Tepe show it was never a solitary marvel but one of a cluster.'
      ],
      whyItMatters: 'The standard sequence was farming first, then surplus, then settlement, then monuments and religion. Göbekli Tepe puts monumental construction at or before the beginning of that chain, which means the story may run at least partly the other way — that the thing people wanted to build together came first, and the agriculture followed to support it.',
      certainty: [
        { label: 'ESTABLISHED', text: 'The site\'s age, scale, and construction by pre-pottery Neolithic communities without metal tools are firmly established by radiocarbon dating and excavation.' },
        { label: 'CONTESTED', text: 'Schmidt\'s "temple before agriculture" interpretation. Current excavators find evidence of residential use and water management, suggesting a settlement with monumental architecture rather than an unpopulated sanctuary.' },
        { label: 'UNRESOLVED', text: 'What the enclosures were for, what the animal carvings mean, why they were deliberately backfilled, and how the labour was organised in a society with no evident hierarchy.' }
      ],
      related: ['OBS-0047', 'OBS-0036', 'OBS-0031'],
      sources: [
        { label: 'German Archaeological Institute (Deutsches Archäologisches Institut) — Göbekli Tepe research project', url: 'https://www.dainst.org/' },
        { label: 'UNESCO World Heritage Centre — Göbekli Tepe, inscribed 2018', url: 'https://whc.unesco.org/' },
        { label: 'Clare et al., reassessments of the site\'s function, Neo-Lithics / Zeitschrift für Orient-Archäologie', url: 'https://www.dainst.org/' }
      ]
    },
    {
      id: 'OBS-0047',
      title: 'Cities Beneath the Amazon',
      category: 'lost-civilizations',
      status: 'CONFIRMED',
      detected: '2024',
      location: 'Upano Valley, Ecuador',
      age: '~2,500 years',
      summary: [
        'Lidar flown over the Upano Valley in the Andean foothills of eastern Ecuador stripped away the forest canopy and revealed more than six thousand rectangular earthen platforms, arranged around plazas, connected by wide, straight, sunken roads running for kilometres — some of them ten metres across — with drainage works and agricultural fields between them. The survey covered around three hundred square kilometres and the settlement does not stop at the edge of it.',
        'The dates run from roughly 500 BCE to somewhere between 300 and 600 CE. Published in Science in January 2024 by a team led by Stéphen Rostain, it is the earliest and largest network of its kind yet documented in Amazonia — a landscape of dispersed towns and farmland, closer to garden urbanism than to a dense walled city, and organised at a scale that requires a large, coordinated population.'
      ],
      whyItMatters: 'The Amazon was long taught as a pristine wilderness, too poor in soil to support anything beyond small mobile groups — a place with no history because it had no monuments. That reading is now indefensible. It also recasts the sixteenth-century Spanish accounts of populous riverside towns, dismissed for centuries as exaggeration, as probably describing the tail end of something real that European disease had already begun to erase. The forest is not untouched. It is, in part, a ruin that grew back.',
      certainty: [
        { label: 'ESTABLISHED', text: 'The earthworks, road network and their approximate dates are documented by airborne lidar combined with decades of ground excavation in the same valley.' },
        { label: 'HYPOTHESIS', text: 'Population estimates range from the low tens of thousands to well over a hundred thousand. The lidar shows structures, not people, and occupancy rates are inferred.' },
        { label: 'UNRESOLVED', text: 'Why the valley was abandoned. Volcanic activity from nearby Sangay is a plausible contributor and is not demonstrated.' }
      ],
      related: ['OBS-0041', 'OBS-0036', 'OBS-0052'],
      sources: [
        { label: 'Rostain et al., "Two thousand years of garden urbanism in the Upper Amazon", Science (2024)', url: 'https://www.science.org/' },
        { label: 'Centre National de la Recherche Scientifique (CNRS)', url: 'https://www.cnrs.fr/en' }
      ]
    },

    /* ------------------------------------------------------------ HUMAN ORIGINS */
    {
      id: 'OBS-0052',
      title: 'The Denisovans',
      category: 'human-origins',
      status: 'ONGOING',
      detected: '2010',
      location: 'Denisova Cave, Altai Mountains, Siberia',
      age: 'Present from at least 200,000 to ~50,000 years ago',
      summary: [
        'In 2010 a laboratory in Leipzig sequenced DNA from the tip of a child\'s finger bone found in a Siberian cave. It was not modern human and it was not Neanderthal. It belonged to a population nobody had known existed, and which had left almost no bones at all — a whole branch of humanity discovered by genome rather than by skeleton.',
        'The physical remains still amount to very little: a finger bone, a few teeth, some fragments, and a jawbone from a cave on the Tibetan Plateau identified in 2019 by its ancient proteins. But the genetics reach much further. Denisovan ancestry survives today at a few per cent in people across Oceania, and a gene variant that helps Tibetans function at high altitude appears to have been inherited from them.',
        'One bone fragment from the cave, sequenced in 2018, turned out to belong to a girl whose mother was Neanderthal and whose father was Denisovan. Not a distant admixture event — a first-generation child.'
      ],
      whyItMatters: 'Within a decade, the idea of a single ascending line of human ancestry became untenable. Late Pleistocene Eurasia held at least three distinct human populations that met, interbred, and exchanged genes still doing useful work in living bodies. "Human" turns out to name a braided river rather than a lineage — and the newest branch was found in a fragment small enough to lose.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Denisovans existed as a distinct population, interbred with Neanderthals and with modern humans, and contributed ancestry to living people. This rests on high-coverage ancient genomes and is not seriously disputed.' },
        { label: 'ESTABLISHED', text: 'The Xiahe mandible from the Tibetan Plateau was assigned to Denisovans on ancient protein evidence, extending their known range far beyond Siberia.' },
        { label: 'UNRESOLVED', text: 'What they looked like. With no skull, most reconstructions are inferred from DNA methylation patterns rather than from bone.' },
        { label: 'UNRESOLVED', text: 'How many distinct Denisovan-like populations there were. The genetics of some living groups suggest more than one source.' }
      ],
      related: ['OBS-0058', 'OBS-0047'],
      sources: [
        { label: 'Max Planck Institute for Evolutionary Anthropology, Leipzig', url: 'https://www.eva.mpg.de/' },
        { label: 'Slon et al., "The genome of the offspring of a Neanderthal mother and a Denisovan father", Nature (2018)', url: 'https://www.nature.com/' },
        { label: 'Smithsonian National Museum of Natural History — Human Origins Program', url: 'https://humanorigins.si.edu/' }
      ]
    },
    {
      id: 'OBS-0058',
      title: 'Homo naledi',
      category: 'human-origins',
      status: 'CONTESTED',
      detected: '2013; announced 2015',
      location: 'Rising Star cave system, Cradle of Humankind, South Africa',
      age: '~335,000–236,000 years ago',
      summary: [
        'A chamber deep inside the Rising Star cave system, reachable only through a vertical chute about eighteen centimetres wide, held more than fifteen hundred hominin fossil fragments from at least fifteen individuals of a species nobody had described. Homo naledi mixes traits freely: modern-looking hands and feet, a shoulder built for climbing, and a brain roughly a third the size of ours.',
        'The dating, published in 2017, was the shock. The bones are between about 335,000 and 236,000 years old — not an ancient ancestor but a contemporary of the earliest Homo sapiens, a small-brained human species still going while ours was getting started.',
        'How the bodies got into a chamber that difficult is the open question. In 2023 the excavation team argued for deliberate disposal of the dead, together with engraved markings on the cave walls and controlled use of fire. The claims were published alongside unusually blunt public assessments from reviewers, who judged the evidence incomplete and the alternatives inadequately excluded. The argument is live and has not been settled.'
      ],
      whyItMatters: 'The tidy version of human evolution — brains enlarge, complexity follows, one species at a time — does not survive this site. A small-brained hominin was alive alongside us in the last few hundred thousand years, and whether or not it buried its dead, the fact that competent researchers cannot yet resolve the question is itself the finding. It is a useful example of science being argued in public, at volume, without a resolution.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Homo naledi is a distinct species, known from an exceptionally large fossil assemblage, and dated to roughly 335,000–236,000 years ago.' },
        { label: 'CONTESTED', text: 'Deliberate burial, wall engravings, and controlled fire use. Presented by the excavating team in 2023 and publicly disputed by reviewers and other specialists; taphonomic alternatives remain on the table.' },
        { label: 'UNRESOLVED', text: 'How the remains reached the chamber, and where Homo naledi sits on the hominin family tree.' }
      ],
      related: ['OBS-0052'],
      sources: [
        { label: 'Berger et al., "Homo naledi, a new species of the genus Homo from the Dinaledi Chamber, South Africa", eLife (2015)', url: 'https://elifesciences.org/' },
        { label: 'Dirks et al., "The age of Homo naledi and associated sediments in the Rising Star Cave", eLife (2017)', url: 'https://elifesciences.org/' },
        { label: 'University of the Witwatersrand, Johannesburg', url: 'https://www.wits.ac.za/' }
      ]
    },

    /* --------------------------------------------------------------- TECHNOLOGY */
    {
      id: 'OBS-0063',
      title: 'The Antikythera Mechanism',
      category: 'technology',
      status: 'ONGOING',
      detected: 'Recovered 1901; understood from 2006',
      location: 'Shipwreck off Antikythera, Greece',
      age: '~2,100 years',
      summary: [
        'Sponge divers sheltering from a storm found a Roman-era wreck off the island of Antikythera and brought up bronzes, glass, and a corroded lump that split open to show gear teeth. It took most of a century to work out what it was, and imaging technology that did not exist when it was found.',
        'It is a geared astronomical calculator. Eighty-two fragments survive, containing at least thirty bronze gears, and the reconstructed device tracks the positions of the Sun and Moon, displays the lunar phase, predicts eclipses on the Saros cycle, and runs the Metonic calendar and the four-year cycle of the Panhellenic games. One assembly uses a pin-and-slot arrangement to model the Moon\'s varying speed across the sky — a mechanical implementation of an astronomical theory.',
        'In 2006 microfocus X-ray computed tomography read inscriptions and gear counts inside fragments that cannot be opened, effectively recovering the instrument\'s manual from the inside of the corrosion.'
      ],
      whyItMatters: 'Nothing of comparable geared complexity appears anywhere in the surviving record for more than a thousand years afterwards. That gap is the interesting part: either this device was a singular achievement that left no successors, or — far more likely — it belonged to a tradition of instrument-making whose products were bronze, and bronze gets melted down. What we have is one object that happened to sink. It is the strongest available argument that the history of technology is not a record of what was invented, but a record of what survived.',
      certainty: [
        { label: 'ESTABLISHED', text: 'The mechanism is a geared astronomical instrument of Greek origin, dated to roughly the second century BCE. Its eclipse prediction, calendar functions and lunar anomaly mechanism are read directly from surviving gearing and inscriptions.' },
        { label: 'HYPOTHESIS', text: 'That it belonged to a wider tradition rather than being unique. Cicero describes similar devices attributed to Archimedes and Posidonius, but no other example has been found.' },
        { label: 'UNRESOLVED', text: 'Who built it, where, and the exact configuration of the front display — reconstructions of the planetary indications differ.' }
      ],
      related: ['OBS-0068', 'OBS-0041'],
      sources: [
        { label: 'Freeth et al., "Decoding the ancient Greek astronomical calculator known as the Antikythera Mechanism", Nature (2006)', url: 'https://www.nature.com/' },
        { label: 'National Archaeological Museum, Athens', url: 'https://www.namuseum.gr/en/' }
      ]
    },
    {
      id: 'OBS-0068',
      title: 'Roman Marine Concrete',
      category: 'technology',
      status: 'CONFIRMED',
      detected: 'Chemistry resolved 2017–2023',
      location: 'Harbour works across the Mediterranean',
      age: '~2,000 years',
      summary: [
        'Roman concrete piers have stood in seawater for two millennia. Modern reinforced concrete in the same conditions is doing well to last a century. For a long time this was filed under lost knowledge; it is now largely understood, and the answer is stranger than a lost recipe.',
        'The Romans mixed volcanic ash from the Bay of Naples with lime and seawater. In the marine structures the seawater keeps reacting with the ash over centuries, growing interlocking crystals of aluminous tobermorite and phillipsite through the matrix. The material does not merely resist the sea; it uses it, and gets tougher.',
        'A second mechanism was identified in 2023. The pale lumps of lime scattered through Roman concrete had been read for decades as evidence of careless mixing. A team at MIT showed they are functional: when a crack opens and water reaches one, it dissolves and recrystallises as calcium carbonate, sealing the crack. The concrete repairs itself, and the "sloppy" inclusions are the repair kit.'
      ],
      whyItMatters: 'Cement production accounts for a large share of global carbon dioxide emissions, and much of that is spent replacing structures that failed early. A material that strengthens in seawater and heals its own cracks is not an antiquarian curiosity, it is a live engineering target. It is also a warning about reading the past: the feature that looked like incompetence for a century was the design.',
      certainty: [
        { label: 'ESTABLISHED', text: 'The mineralogy of Roman marine concrete, including the growth of aluminous tobermorite in seawater over long periods, has been characterised directly from drilled cores of ancient harbour structures.' },
        { label: 'ESTABLISHED', text: 'Lime clasts enable crack-healing. The mechanism was demonstrated experimentally on both ancient samples and reproduced hot-mixed concrete.' },
        { label: 'UNRESOLVED', text: 'How deliberate any of this was. Whether Roman builders understood the chemistry or arrived at the method by long empirical iteration is not something the material can tell us.' }
      ],
      related: ['OBS-0063'],
      sources: [
        { label: 'Jackson et al., "Phillipsite and Al-tobermorite mineral cements produced through low-temperature water-rock reactions in Roman marine concrete", American Mineralogist (2017)', url: 'https://www.minsocam.org/' },
        { label: 'Seymour, Masic et al., "Hot mixing: Mechanistic insights into the durability of ancient Roman concrete", Science Advances (2023)', url: 'https://www.science.org/journal/sciadv' },
        { label: 'Massachusetts Institute of Technology', url: 'https://www.mit.edu/' }
      ]
    },

    /* ---------------------------------------------------------- QUANTUM REALITY */
    {
      id: 'OBS-0074',
      title: 'Bell\'s Theorem',
      category: 'quantum-reality',
      status: 'CONFIRMED',
      detected: '1964; experimentally closed 2015',
      location: 'Laboratories worldwide',
      age: null,
      summary: [
        'Einstein, Podolsky and Rosen argued in 1935 that quantum mechanics must be incomplete, because it implied that measuring one particle instantly fixed a property of its distant partner. Surely, they said, the answer was there all along and the theory simply failed to mention it.',
        'In 1964 John Bell found a way to settle the argument by experiment. If the answers exist in advance and nothing travels faster than light, then correlations between distant measurements must obey a particular limit. Quantum mechanics predicts violations of that limit. This is not philosophy: it is a number you can measure.',
        'Experiments from the 1970s onward found the violations, and each time critics identified a loophole through which a classical explanation might still crawl. In 2015 three independent groups closed the major loopholes simultaneously. The 2022 Nobel Prize in Physics went to Clauser, Aspect and Zeilinger for the work.'
      ],
      whyItMatters: 'Local realism — the assumption that things have definite properties before you look, and that nothing influences anything else faster than light — is not a philosophical preference we could keep if we wanted to. It is ruled out by measurement. One of those two assumptions is wrong about the world, and physics has no consensus on which. Meanwhile nothing about it permits sending a signal faster than light, and the same effect is now the basis of working quantum cryptography.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Bell inequality violations are observed, reproducible, and confirmed in loophole-free experiments. Local hidden-variable theories are excluded.' },
        { label: 'ESTABLISHED', text: 'No faster-than-light signalling is possible using entanglement. The correlations only become visible when both parties compare results through an ordinary classical channel.' },
        { label: 'UNRESOLVED', text: 'What it means. Copenhagen, many-worlds, pilot-wave and relational interpretations all reproduce the same predictions and disagree completely about what is happening. The measurement problem — why observation yields one definite outcome — has no accepted solution.' }
      ],
      related: ['OBS-0079', 'OBS-0085'],
      sources: [
        { label: 'Hensen et al., "Loophole-free Bell inequality violation using electron spins separated by 1.3 kilometres", Nature (2015)', url: 'https://www.nature.com/' },
        { label: 'The Nobel Prize in Physics 2022 — scientific background', url: 'https://www.nobelprize.org/prizes/physics/2022/summary/' },
        { label: 'QuTech, Delft University of Technology', url: 'https://qutech.nl/' }
      ]
    },
    {
      id: 'OBS-0079',
      title: 'The Robin\'s Compass',
      category: 'quantum-reality',
      status: 'ONGOING',
      detected: 'Mechanism proposed 1978; in vitro support 2021',
      location: 'The eyes of migratory birds',
      age: null,
      summary: [
        'European robins migrate at night and can hold a heading using the Earth\'s magnetic field. Their compass has two peculiarities: it reads the inclination of the field rather than its polarity, and it does not work in darkness — it needs light of the right wavelength reaching the eye.',
        'The leading explanation is that the sensor is a chemical reaction in the retina. Light striking a protein called cryptochrome creates a pair of molecules each carrying an unpaired electron, whose spins are weakly coupled. The Earth\'s magnetic field, though far too feeble to move anything mechanically, can tip the balance between two quantum spin states, changing which chemical products form. The bird would, in effect, see the field.',
        'In 2021 a team isolated cryptochrome 4 from European robins and showed that the purified protein is magnetically sensitive in vitro — and that the same protein from chickens and pigeons, which do not migrate, is markedly less so.'
      ],
      whyItMatters: 'Quantum effects are normally destroyed almost instantly by the warmth and noise of a living body — that is why "quantum biology" attracts scepticism, and why several earlier claims in the field have been substantially revised. The robin compass is the most credible surviving candidate for a biological process that only works because of quantum spin dynamics. If it holds, evolution found and exploited a subatomic effect several hundred million years before we described it.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Migratory birds possess a light-dependent, inclination-based magnetic compass. This is behaviourally demonstrated and not in doubt.' },
        { label: 'ESTABLISHED', text: 'Cryptochrome 4 from European robins is magnetically sensitive in the test tube, more so than in non-migratory relatives.' },
        { label: 'HYPOTHESIS', text: 'That the radical pair mechanism in cryptochrome is the compass in a living bird. The in vitro chemistry is supportive; the demonstration in vivo has not been made.' },
        { label: 'UNRESOLVED', text: 'How the signal reaches the brain, and how a spin-state effect stays coherent long enough to matter inside a warm eye.' }
      ],
      related: ['OBS-0074', 'OBS-0027'],
      sources: [
        { label: 'Xu et al., "Magnetic sensitivity of cryptochrome 4 from a migratory songbird", Nature (2021)', url: 'https://www.nature.com/' },
        { label: 'Hore & Mouritsen, "The radical-pair mechanism of magnetoreception", Annual Review of Biophysics (2016)', url: 'https://www.annualreviews.org/' },
        { label: 'University of Oxford, Department of Chemistry', url: 'https://www.ox.ac.uk/' }
      ]
    },

    /* ----------------------------------------------------------- THE UNIVERSE */
    {
      id: 'OBS-0085',
      title: 'Dark Matter',
      category: 'universe',
      status: 'UNRESOLVED',
      detected: '1933; established from the 1970s',
      location: 'Everywhere, apparently',
      age: null,
      summary: [
        'Fritz Zwicky measured the galaxies in the Coma Cluster in 1933, found them moving far too fast for the cluster\'s visible mass to hold them, and concluded there was something else there. He was largely ignored for forty years. In the 1970s Vera Rubin and Kent Ford measured how fast stars orbit within individual galaxies and found the same problem, everywhere they looked: the outer stars move as though the galaxy weighs several times what its light suggests.',
        'The evidence has only accumulated. Gravitational lensing weighs the invisible mass directly. In the Bullet Cluster — two clusters caught mid-collision — the hot gas, which is most of the ordinary matter, has been stripped and left behind, while the gravitational mass has sailed on through with the galaxies. The cosmic microwave background fixes the proportions: roughly five per cent ordinary matter, twenty-seven per cent dark matter, the rest dark energy.',
        'Everything we have ever seen, touched, or been made of is the five per cent. And after decades of increasingly sensitive detectors built underground to catch a particle of the twenty-seven, none has been caught.'
      ],
      whyItMatters: 'This is the largest known gap between the confidence of a measurement and the poverty of an explanation. We can map dark matter, weigh it, watch it shape the growth of every structure in the universe — and we cannot say what it is. It is the honest centrepiece of any observatory: the thing that is everywhere, obviously there, and entirely unidentified.',
      certainty: [
        { label: 'ESTABLISHED', text: 'There is substantially more gravitating mass than visible matter, on every scale from galaxies to the whole observable universe. Rotation curves, lensing, cluster dynamics, the cosmic microwave background and structure formation all agree.' },
        { label: 'HYPOTHESIS', text: 'That it consists of an undiscovered particle. Direct-detection experiments have repeatedly excluded the most favoured candidate ranges without finding anything.' },
        { label: 'HYPOTHESIS', text: 'Modified gravity as an alternative. It handles individual galaxy rotation curves elegantly but struggles with clusters, the Bullet Cluster, and the cosmic microwave background.' },
        { label: 'UNRESOLVED', text: 'What it is.' }
      ],
      related: ['OBS-0094', 'OBS-0074'],
      sources: [
        { label: 'Rubin & Ford, "Rotation of the Andromeda Nebula from a spectroscopic survey of emission regions", Astrophysical Journal (1970)', url: 'https://iopscience.iop.org/journal/0004-637X' },
        { label: 'Clowe et al., "A direct empirical proof of the existence of dark matter", Astrophysical Journal Letters (2006)', url: 'https://iopscience.iop.org/' },
        { label: 'CERN — Dark matter', url: 'https://home.cern/science/physics/dark-matter' }
      ]
    },
    {
      id: 'OBS-0088',
      title: 'Voyager 1',
      category: 'universe',
      status: 'ONGOING',
      detected: 'Launched 5 September 1977',
      location: 'Interstellar space',
      age: 'Operating for over four decades',
      summary: [
        'Voyager 1 was built to visit Jupiter and Saturn. It did that by 1980, and then kept going. In August 2012 it crossed the heliopause — the boundary where the Sun\'s outflowing wind finally gives way to the gas between the stars — and became the first object made by people to leave the solar bubble and report back from outside it.',
        'It runs on a plutonium thermoelectric generator whose output falls a little every year, so instruments have been switched off one at a time to keep the rest alive. Its computers hold a fraction of the memory of a modern doorbell. In late 2023 a single failed memory chip left it transmitting unreadable data for months; engineers diagnosed the fault across a round trip of nearly two days, wrote a patch that relocated the affected code, and got it talking again in 2024.',
        'Bolted to the side is a gold-plated copper disc carrying greetings in fifty-five languages, images, and ninety minutes of music. Nobody expects it to be found.'
      ],
      whyItMatters: 'It is the furthest thing we have ever made, still under command, still answering, on a design finalised before the personal computer existed. Its telemetry has already rewritten what we thought the edge of the solar system was made of. In roughly a decade its power will fall below what the last instrument needs, and it will go quiet and continue anyway — a functioning argument that the reach of a project can outlive the certainty of its builders.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Launch date, planetary encounters, and the 2012 heliopause crossing are all confirmed by mission telemetry.' },
        { label: 'ESTABLISHED', text: 'The distance shown on this Observatory\'s status panel is calculated from a published reference position and Voyager 1\'s near-constant velocity of roughly 17 kilometres per second. It is an extrapolation, accurate to well under one per cent, not a live feed.' },
        { label: 'UNRESOLVED', text: 'The structure of the boundary it crossed. The heliopause turned out to be more complicated than any pre-encounter model, and Voyager 2\'s crossing at a different place and time looked different again.' }
      ],
      related: ['OBS-0094', 'OBS-0106'],
      sources: [
        { label: 'NASA — Voyager mission', url: 'https://science.nasa.gov/mission/voyager/' },
        { label: 'NASA Jet Propulsion Laboratory — Voyager mission status', url: 'https://voyager.jpl.nasa.gov/mission/status/' }
      ]
    },
    {
      id: 'OBS-0094',
      title: 'The Fermi Paradox',
      category: 'universe',
      status: 'UNRESOLVED',
      detected: '1950',
      location: 'Los Alamos, New Mexico — over lunch',
      age: null,
      summary: [
        'The story is that Enrico Fermi, walking to lunch with colleagues at Los Alamos in 1950 and half-listening to a conversation about flying saucers, interrupted with a question along the lines of: where is everybody?',
        'The force of it is arithmetic. The galaxy is around thirteen billion years old and a hundred thousand light years across. Even at speeds we could imagine building, a civilisation inclined to spread could cross it in a few tens of millions of years — an eyeblink against the age of the place. Many stars are older than the Sun. The galaxy should be thoroughly settled by now, or at least noisy. It is not. We have found thousands of planets around other stars and no confirmed sign that anything is living on any of them.',
        'Every proposed answer is uncomfortable. Perhaps the step from chemistry to life is vanishingly rare. Perhaps intelligence is. Perhaps there is a filter ahead of us rather than behind. Perhaps everyone is listening rather than transmitting, or transmitting in a way we have not thought to check. Perhaps we have simply not looked at very much: the total volume of sky, frequency and time that SETI has genuinely searched is, by one well-known comparison, a hot tub\'s worth of an ocean.'
      ],
      whyItMatters: 'It is the cleanest example of a question where the absence of evidence is itself the data, and where every available answer changes what we should expect of our own future. If the filter is behind us, we are extraordinarily lucky and probably alone. If it is ahead of us, we are not. There is no experiment that settles it and no reason to think the answer is unknowable — which is the exact condition that makes something worth wondering about.',
      certainty: [
        { label: 'ESTABLISHED', text: 'No confirmed detection of extraterrestrial life or technology has ever been made. More than five thousand exoplanets are confirmed, many of them rocky and in temperate orbits.' },
        { label: 'ESTABLISHED', text: 'The searches conducted so far cover a very small fraction of the possible parameter space of frequency, direction, timing and signal type.' },
        { label: 'HYPOTHESIS', text: 'The Great Filter, the Rare Earth hypothesis, and the various "they are there and quiet" arguments are all internally coherent and none has supporting evidence beyond the silence itself.' },
        { label: 'UNRESOLVED', text: 'Whether the question is even well posed. Our estimate of how common life should be rests on a sample of one.' }
      ],
      related: ['OBS-0101', 'OBS-0106', 'OBS-0085', 'OBS-0088'],
      sources: [
        { label: 'SETI Institute', url: 'https://www.seti.org/' },
        { label: 'NASA Exoplanet Exploration', url: 'https://science.nasa.gov/exoplanets/' },
        { label: 'Wright et al., "How much SETI has been done? Finding needles in the n-dimensional cosmic haystack", Astronomical Journal (2018)', url: 'https://iopscience.iop.org/journal/1538-3881' }
      ]
    },

    /* ---------------------------------------------------------- THE UNKNOWN */
    {
      id: 'OBS-0101',
      title: 'The Wow! Signal',
      category: 'the-unknown',
      status: 'UNRESOLVED',
      detected: '15 August 1977',
      location: 'Big Ear radio telescope, Ohio State University',
      age: null,
      summary: [
        'The Big Ear telescope surveyed the sky by standing still and letting the Earth turn beneath it, printing its results as columns of characters on continuous paper. A few days after the run, the astronomer Jerry Ehman went through the printout and found a sequence reading 6EQUJ5 — an intensity ramp far above anything around it. He circled it in red pen and wrote "Wow!" in the margin.',
        'The signal was narrowband, close to the 1420 MHz emission line of neutral hydrogen — the frequency long argued to be the obvious one for an interstellar transmitter to choose. It lasted seventy-two seconds, exactly the time the telescope\'s beam needed to sweep past a fixed point in the sky. That rules out most terrestrial interference: a source on the ground or in orbit would not have tracked the stars.',
        'It has never been seen again, despite repeated searches with far more sensitive instruments. Explanations have been proposed — a pair of comets in 2017, a magnetar flare stimulating emission from a cold hydrogen cloud in 2024 — and each has been argued against. Nothing has stuck.'
      ],
      whyItMatters: 'A single unrepeated event is the weakest possible result and it has stayed in the record for nearly fifty years, because the alternative — deciding it did not happen — is worse. It is the archive\'s standing example of an observation held open: catalogued precisely, explained not at all, and not quietly discarded because it is inconvenient. Most of what an observatory does is wait for the second data point.',
      certainty: [
        { label: 'ESTABLISHED', text: 'A strong, narrowband, unexplained radio signal was recorded on 15 August 1977, with a profile consistent with a source fixed relative to the stars. The printout survives.' },
        { label: 'ESTABLISHED', text: 'It has never been redetected, and the Big Ear\'s design meant there was no second horn confirmation and no way to return to it quickly.' },
        { label: 'HYPOTHESIS', text: 'Cometary hydrogen clouds (2017) and stimulated hydrogen emission from a magnetar flare (2024) have both been proposed. Both have been criticised on the grounds that they do not reproduce a signal that narrow or that strong.' },
        { label: 'SPECULATION', text: 'An artificial origin. Nothing in the data supports it beyond the choice of frequency, and one unrepeated detection cannot carry that weight.' }
      ],
      related: ['OBS-0094', 'OBS-0106'],
      sources: [
        { label: 'Ehman, "The Big Ear Wow! Signal: What We Know and Don\'t Know About It After 20 Years" (1997)', url: 'https://www.bigear.org/' },
        { label: 'Ohio State University', url: 'https://www.osu.edu/' },
        { label: 'SETI Institute', url: 'https://www.seti.org/' }
      ]
    },
    {
      id: 'OBS-0106',
      title: '1I/ʻOumuamua',
      category: 'the-unknown',
      status: 'UNRESOLVED',
      detected: '19 October 2017',
      location: 'Passed through the inner solar system and left',
      age: null,
      summary: [
        'The Pan-STARRS survey on Haleakalā picked up an object already on its way out. Its orbit was hyperbolic and unmistakably unbound: it had come from outside the solar system, passed the Sun, and was leaving for good. It was the first confirmed interstellar object, and it was found with weeks to observe it and no possibility of a return visit.',
        'It was strange in almost every measurement. Its brightness varied by a factor of around eight as it tumbled, implying an extremely elongated or flattened shape unlike anything in our own system. It showed no coma, no tail, no dust — and yet it accelerated slightly as it departed, more than the Sun\'s gravity alone accounts for. Comets do that, because they outgas; this thing was not visibly outgassing.',
        'Proposals followed: an iceberg of frozen hydrogen, a nitrogen-ice shard chipped off a Pluto-like body, an object so porous it was pushed by sunlight. A 2023 paper argued for molecular hydrogen trapped in water ice and released on warming, which currently fits best. A widely publicised suggestion that it was an artificial lightsail has not persuaded the field.',
        'Two more interstellar objects have been found since — 2I/Borisov in 2019, which behaved like an ordinary comet, and a third in 2025. Neither resembled the first.'
      ],
      whyItMatters: 'For a few weeks we had a physical sample of another star system passing through, and the instruments to look were not aimed and ready. That is the lesson the object left behind: the survey telescopes now coming online are expected to find these regularly, and the difference between a curiosity and a science will be whether something can be launched in time to meet one. ʻOumuamua is filed under the unknown not because it is inexplicable but because we ran out of time to ask.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Its interstellar origin is certain from orbital dynamics. The non-gravitational acceleration and the large brightness variation are measured, not inferred.' },
        { label: 'ESTABLISHED', text: 'No object was ever resolved in an image. Every statement about its shape comes from how its brightness changed as it tumbled.' },
        { label: 'HYPOTHESIS', text: 'Trapped molecular hydrogen released from a water-ice body is the current leading explanation for accelerating without a visible tail. Nitrogen ice and ultra-porous dust aggregates remain on the table.' },
        { label: 'SPECULATION', text: 'An artificial origin, proposed by a small minority. It is not supported by the observations and is not the position of the field.' }
      ],
      related: ['OBS-0101', 'OBS-0094', 'OBS-0088'],
      sources: [
        { label: 'Micheli et al., "Non-gravitational acceleration in the trajectory of 1I/2017 U1 (ʻOumuamua)", Nature (2018)', url: 'https://www.nature.com/' },
        { label: 'Bergner & Seligman, "Acceleration of 1I/ʻOumuamua from radiolytically produced H2 in H2O ice", Nature (2023)', url: 'https://www.nature.com/' },
        { label: 'IAU Minor Planet Center', url: 'https://www.minorplanetcenter.net/' }
      ]
    },

    /* --------------------------------------------------------------- ANOMALY
       The doorway. Deliberately unfinished — see observatory.js, which gives
       this record its own presentation. Do not "complete" it. */
    {
      id: 'OBS-____',
      title: '?',
      designation: 'EL−1',
      category: 'the-unknown',
      status: 'UNCLASSIFIED',
      special: 'anomaly',
      pos: { x: 0.86, y: 0.34 },
      detected: 'Recurrent',
      location: 'Bearing consistent with this building',
      age: null,
      summary: [
        'Periodic. Narrowband. Interior.',
        'The source does not resolve. Attempts to fix a position return a bearing that terminates below the instrument floor, which is not a direction the catalogue has a field for.',
        'Logged and left open.'
      ],
      whyItMatters: 'Not yet determined.',
      certainty: [
        { label: 'ESTABLISHED', text: 'Something is transmitting.' },
        { label: 'UNRESOLVED', text: 'Everything else.' }
      ],
      related: ['OBS-0101'],
      sources: []
    }
  ];

  /* Colour tone per status. The renderer and the record view both read this,
     so a new status only needs adding here. */
  var STATUS_TONE = {
    CONFIRMED:    'trace',
    ONGOING:      'trace',
    CONTESTED:    'signal',
    UNRESOLVED:   'violet',
    UNCLASSIFIED: 'ash'
  };

  global.OBSERVATORY_DATA = {
    categories: CATEGORIES,
    observations: OBSERVATIONS,
    statusTone: STATUS_TONE
  };
})(window);
