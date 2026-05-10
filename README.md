# Transports publics à Yverdon-les-Bains — Évolution de l’offre et de l’utilisation

## Description des données

Ce projet s’appuie sur plusieurs sources de données publiques et institutionnelles afin d’analyser l’évolution de l’offre de transports publics et de leur utilisation dans la région d’Yverdon-les-Bains.

Les données finales utilisées dans le projet seront principalement structurées en **JSON** et en **CSV**.

### Formats de données

Deux formats principaux seront utilisés :

* **JSON** : pour structurer des données complexes comme les lignes de transport, les trajets et les points d’arrêt.
* **CSV** : pour les tableaux simples comme les statistiques de fréquentation, les kilomètres parcourus ou les données financières.

### Structure générale

Les données seront organisées autour de plusieurs types d’informations :

**1. Réseau et trajets**

Ces données décrivent la structure du réseau de transports publics.

Attributs possibles :

* `line_id` : identifiant de la ligne
* `line_name` : nom de la ligne
* `transport_type` : type de transport (train, bus)
* `stop_name` : nom de l’arrêt
* `latitude` : coordonnée géographique
* `longitude` : coordonnée géographique
* `departure_time` : heure de départ
* `arrival_time` : heure d’arrivée
* `year` : année de référence

Types de données :

* texte (nom de ligne, arrêt)
* nombres (coordonnées)
* dates / heures
* identifiants

**2. Évolution de l’offre**

Ces données permettront d’identifier les changements dans le réseau :

* évolution des **horaires**
* évolution de la **cadence**
* modification des **parcours**
* création ou suppression de **correspondances**

Attributs possibles :

* `year`
* `line_id`
* `frequency`
* `travel_time`
* `connections`
* `route_changes`

**3. Utilisation du réseau**

Ces données permettront d’analyser l’évolution de la fréquentation.

Attributs possibles :

* `station_name`
* `year`
* `passengers`
* `daily_average`
* `annual_total`

**4. Données d’exploitation**

Certaines données proviennent de rapports de gestion et permettent de contextualiser l’évolution du réseau.

Attributs possibles :

* `year`
* `line_km`
* `operating_cost`
* `revenue`
* `profit_or_loss`

### Relations entre données

Les données ne sont pas nécessairement liées dans une base relationnelle.
Elles proviennent de **sources indépendantes** et seront utilisées de manière comparative pour soutenir l’analyse.

### Nettoyage et préparation

Le travail de préparation des données constitue une étape importante du projet.

Certaines sources présentent plusieurs difficultés :

* **structures complexes ou hétérogènes**
* **formats différents selon les années**
* **données dispersées dans des documents**
* **extraction manuelle nécessaire**

Une partie du travail consistera donc à :

* identifier les informations pertinentes
* harmoniser les formats
* reconstruire des séries temporelles comparables

---

# But du projet

Ce projet combine **exploration de données** et **narration explicative**.

## Approche exploratoire

Nous cherchons à observer plusieurs tendances :

* évolution de la **cadence des transports**
* modification des **parcours et correspondances**
* croissance de la **fréquentation des gares**
* relation possible entre **développement de l’offre** et **utilisation réelle**

L’exploration permet de faire émerger des tendances qui ne sont pas immédiatement visibles dans les sources brutes.

## Approche explicative

L’objectif est également de **raconter une histoire** :

> Comment l’offre de transports publics a évolué dans la région d’Yverdon-les-Bains et comment cette évolution influence leur utilisation.

Le projet vise notamment à montrer :

* les **améliorations du réseau**
* les **zones encore insuffisamment desservies et/ou dégradation de la déserte locale**
* la manière dont l’augmentation de l’offre peut encourager l’utilisation des transports publics.

## Regard porté sur les données

Ce projet adopte un regard critique et analytique.

Plusieurs questions guident l’analyse :

* Les investissements publics dans les transports se traduisent-ils réellement par une amélioration de l’offre ?
* L’augmentation de l’offre entraîne-t-elle une hausse de l’utilisation ?
* Quels types de changements ont le plus d’impact sur les usagers ?

L’objectif final est de **rendre ces informations accessibles au grand public**, dans une forme visuelle et compréhensible.

---

# Sources de données

Plusieurs sources sont utilisées pour reconstruire l’évolution du réseau.

## Archives des horaires des transports publics suisses

Source : archives d’horaires publiées par l’Office fédéral des transports.

But initial :
fournir un horaire officiel public, conservé ensuite sous forme d’archives.

Utilisation dans ce projet :

* évolution des horaires
* évolution de la cadence
* changements de parcours
* évolution des correspondances

Difficulté :

* données brutes
* structure complexe
* extraction des informations difficile

---

## Rapports de gestion de Travys

Source : rapports annuels de l’entreprise de transport.

But initial :
informer les actionnaires et partenaires lors des assemblées générales.

Utilisation dans ce projet :

* kilomètres parcourus par ligne
* évolution de l’exploitation
* bénéfices ou pertes

Difficulté :

* informations présentées sous différentes formes
* indicateurs variables selon les années

---

## Trafic voyageurs des CFF

Source : données de fréquentation des gares.

But initial :
suivre l’évolution de l’utilisation du réseau ferroviaire.

Utilisation dans ce projet :

* évolution du nombre de voyageurs
* analyse de la fréquentation des gares de la région

Difficulté :

* interface principalement cartographique
* accès direct aux données parfois limité
* extraction automatisée souhaitable (JSON)

---

## Documents de planification publique

Ces documents permettent de contextualiser l’évolution du réseau.

Exemples :

* Transition énergétique et mobilité dans le canton de Vaud à l’horizon 2050
* Rapport de l’espace de planification Vaud pour l’horizon PRODES 2030
* Stratégie cantonale ferroviaire — Vision 2050

Ils permettent d’identifier :

* les **objectifs politiques**
* les **investissements prévus**
* les **orientations futures du réseau**

---

# Références et inspirations

Même si peu de projets se concentrent spécifiquement sur l’évolution des transports publics à l’échelle d’une ville comme Yverdon-les-Bains, plusieurs travaux ont inspiré ce projet.

## Visualisation et narration de données

Certaines plateformes utilisent les données pour raconter des histoires accessibles au grand public :

* The Pudding
* projets de data-journalisme dans la presse
* visualisations interactives sur la mobilité

Ces projets montrent comment transformer des données complexes en **récits visuels compréhensibles**.

## Projets liés aux transports

Plusieurs initiatives analysent les réseaux de transport :

* cartographies d’isochrones (zones accessibles en un temps donné)
* analyses académiques du réseau ferroviaire suisse
* visualisations interactives de réseaux de transport

Cependant, ces projets sont souvent :

* **statistiques**
* **nationaux**
* **centrés sur une photographie du réseau**

Notre approche se distingue par :

* une **analyse temporelle**
* une **échelle régionale**
* une **narration accessible au grand public**

---

# Public cible

Ce projet s’adresse principalement au **grand public**.

L’objectif est de rendre visibles des informations qui existent déjà mais qui restent souvent difficiles à comprendre car :

* dispersées dans plusieurs sources
* présentées sous forme technique
* peu visualisées

Grâce à la visualisation et à la narration de données, ce projet cherche à proposer une lecture claire de l’évolution des transports publics dans la région d’Yverdon-les-Bains.
