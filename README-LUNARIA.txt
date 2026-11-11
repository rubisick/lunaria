LUNARIA — Boutique de lunettes en ligne (HTML / CSS / JavaScript)

Ouvrir index.html dans un navigateur, ou utiliser Live Server dans VS Code.
Aucun serveur ni installation n’est nécessaire.

------------------------------------------------------------
PAGES DE LA BOUTIQUE
------------------------------------------------------------
- index.html          Accueil (ciel étoilé animé, collections, sélection, avis, infolettre)
- catalog-list.html   Catalogue : filtres (type, forme, matériau, prix, nouveautés,
                      soldes, stock), tri, recherche. Les filtres sont gardés dans l’URL :
                      catalog-list.html?type=solaire  ·  ?tag=nouveau  ·  ?q=ronde
- product.html        Fiche produit : product.html?id=ambre (&color=miel)
                      Couleurs, verres, options, ordonnance, dimensions, avis, suggestions
- cart.html           Panier : quantités, codes promo, livraison gratuite dès 100 $
- checkout.html       Caisse : coordonnées, adresse, livraison, taxes par province, paiement
- order.html          Confirmation et suivi de commande (order.html?id=LUN-XXXXXXX)
- wishlist.html       Favoris
- auth.html           Compte client : connexion, inscription, commandes, adresse
- contacts.html       Formulaire de contact
- aide.html           Livraison, retours, garantie, ordonnance, FAQ, conditions
- 404.html            Page introuvable

Les autres fichiers .html (blog, compare, elements, catalog-gallery, etc.) viennent du
modèle AllStore d’origine et ne sont plus liés depuis la boutique.

------------------------------------------------------------
FICHIERS
------------------------------------------------------------
- css/store.css              Design complet de la boutique (couleurs, polices, effets)
- js/store/products.js       Catalogue : produits, prix, couleurs, verres, options, stock.
                             Les montures sont dessinées en SVG et recolorées selon la couleur.
- js/store/core.js           Panier, favoris, codes promo, taxes, livraison, compte,
                             commandes, en-tête / pied de page, tiroir panier, recherche,
                             notifications et animations
- js/store/page-*.js         Code propre à chaque page

Pour ajouter une monture : copier un bloc dans le tableau « products » de
js/store/products.js (id unique, forme parmi SHAPES, couleurs, prix, stock).

------------------------------------------------------------
À SAVOIR (DÉMO)
------------------------------------------------------------
- Le panier, les favoris, les comptes et les commandes sont enregistrés dans le navigateur
  (localStorage). Vider les données du site remet la boutique à zéro (stock compris).
- Le paiement est simulé : utiliser la carte test 4242 4242 4242 4242, une date future et
  n’importe quel CVC. Le numéro de carte n’est jamais conservé (seulement les 4 derniers
  chiffres). Pour vendre réellement, il faut brancher un service de paiement (ex. Stripe)
  et un serveur pour les comptes et les commandes.
- Codes promo : BIENVENUE15 (15 % dès 100 $, offert à l’inscription à l’infolettre),
  LUNE10 (10 %), PLEINELUNE (25 $ dès 150 $).
- Taxes calculées selon la province de livraison (TPS, TVQ, TVH, TVP).

------------------------------------------------------------
IDENTITÉ VISUELLE
------------------------------------------------------------
Couleurs : #1A2E40 · #023859 · #364C59 · #F2CCB6 · #BF947A
Polices : Cormorant Garamond (titres) et Jost (texte), via Google Fonts
Thème : ciel de nuit, lune et phases de lune (bouton « retour en haut » qui se remplit
au défilement, étapes « comment ça marche », chargements).
