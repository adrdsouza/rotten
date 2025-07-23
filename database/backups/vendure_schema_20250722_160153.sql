--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

-- Started on 2025-07-22 16:01:54 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.stock_location_channels_channel DROP CONSTRAINT "FK_ff8150fe54e56a900d5712671a0";
ALTER TABLE ONLY public.asset_tags_tag DROP CONSTRAINT "FK_fb5e800171ffbe9823f2cc727fd";
ALTER TABLE ONLY public.collection_product_variants_product_variant DROP CONSTRAINT "FK_fb05887e2867365f236d7dd95ee";
ALTER TABLE ONLY public.product_variant_asset DROP CONSTRAINT "FK_fa21412afac15a2304f3eb35feb";
ALTER TABLE ONLY public.order_fulfillments_fulfillment DROP CONSTRAINT "FK_f80d84d525af2ffe974e7e8ca29";
ALTER TABLE ONLY public.shipping_method_channels_channel DROP CONSTRAINT "FK_f2b98dfb56685147bed509acc3d";
ALTER TABLE ONLY public.shipping_method_channels_channel DROP CONSTRAINT "FK_f0a17b94aa5a162f0d422920eb2";
ALTER TABLE ONLY public.region DROP CONSTRAINT "FK_ed0c8098ce6809925a437f42aec";
ALTER TABLE ONLY public.session DROP CONSTRAINT "FK_eb87ef1e234444728138302263b";
ALTER TABLE ONLY public.facet_translation DROP CONSTRAINT "FK_eaea53f44bf9e97790d38a3d68f";
ALTER TABLE ONLY public.product_variant_options_product_option DROP CONSTRAINT "FK_e96a71affe63c97f7fa2f076dac";
ALTER TABLE ONLY public.stock_movement DROP CONSTRAINT "FK_e65ba3882557cab4febb54809bb";
ALTER TABLE ONLY public.product_variant_price DROP CONSTRAINT "FK_e6126cd268aea6e9b31d89af9ab";
ALTER TABLE ONLY public.product_variant DROP CONSTRAINT "FK_e38dca0d82fd64c7cf8aac8b8ef";
ALTER TABLE ONLY public.collection_translation DROP CONSTRAINT "FK_e329f9036210d75caa1d8f2154a";
ALTER TABLE ONLY public.shipping_line DROP CONSTRAINT "FK_e2e7642e1e88167c1dfc827fdf3";
ALTER TABLE ONLY public.facet_value_channels_channel DROP CONSTRAINT "FK_e1d54c0b9db3e2eb17faaf5919c";
ALTER TABLE ONLY public.role_channels_channel DROP CONSTRAINT "FK_e09dfee62b158307404202b43a5";
ALTER TABLE ONLY public.customer_channels_channel DROP CONSTRAINT "FK_dc9f69207a8867f83b0fd257e30";
ALTER TABLE ONLY public.order_line DROP CONSTRAINT "FK_dc9ac68b47da7b62249886affba";
ALTER TABLE ONLY public.asset_channels_channel DROP CONSTRAINT "FK_dc4e7435f9f5e9e6436bebd33bb";
ALTER TABLE ONLY public.address DROP CONSTRAINT "FK_dc34d382b493ade1f70e834c4d3";
ALTER TABLE ONLY public.address DROP CONSTRAINT "FK_d87215343c3a3a67e6a0b7f3ea9";
ALTER TABLE ONLY public.stock_movement DROP CONSTRAINT "FK_d2c8d5fca981cc820131f81aa83";
ALTER TABLE ONLY public.product_variant_channels_channel DROP CONSTRAINT "FK_d194bff171b62357688a5d0f559";
ALTER TABLE ONLY public.facet_value DROP CONSTRAINT "FK_d101dc2265a7341be3d94968c5b";
ALTER TABLE ONLY public.order_channels_channel DROP CONSTRAINT "FK_d0d16db872499e83b15999f8c7a";
ALTER TABLE ONLY public.payment DROP CONSTRAINT "FK_d09d285fe1645cd2f0db811e293";
ALTER TABLE ONLY public.collection_channels_channel DROP CONSTRAINT "FK_cdbf33ffb5d4519161251520083";
ALTER TABLE ONLY public.order_line DROP CONSTRAINT "FK_cbcd22193eda94668e84d33f185";
ALTER TABLE ONLY public.order_modification DROP CONSTRAINT "FK_cb66b63b6e97613013795eadbd5";
ALTER TABLE ONLY public.facet_channels_channel DROP CONSTRAINT "FK_ca796020c6d097e251e5d6d2b02";
ALTER TABLE ONLY public.shipping_line DROP CONSTRAINT "FK_c9f34a440d490d1b66f6829b86c";
ALTER TABLE ONLY public.channel DROP CONSTRAINT "FK_c9ca2f58d4517460435cbd8b4c9";
ALTER TABLE ONLY public.collection_closure DROP CONSTRAINT "FK_c309f8cd152bbeaea08491e0c66";
ALTER TABLE ONLY public.payment_method_channels_channel DROP CONSTRAINT "FK_c00e36f667d35031087b382e61b";
ALTER TABLE ONLY public.role_channels_channel DROP CONSTRAINT "FK_bfd2a03e9988eda6a9d11760119";
ALTER TABLE ONLY public.product_variant_channels_channel DROP CONSTRAINT "FK_beeb2b3cd800e589f2213ae99d6";
ALTER TABLE ONLY public.customer_groups_customer_group DROP CONSTRAINT "FK_b823a3c8bf3b78d3ed68736485c";
ALTER TABLE ONLY public.zone_members_region DROP CONSTRAINT "FK_b45b65256486a15a104e17d495c";
ALTER TABLE ONLY public.channel DROP CONSTRAINT "FK_afe9f917a1c82b9e9e69f7c6129";
ALTER TABLE ONLY public.channel DROP CONSTRAINT "FK_af2116c7e176b6b88dceceeb74b";
ALTER TABLE ONLY public.facet_value_channels_channel DROP CONSTRAINT "FK_ad690c1b05596d7f52e52ffeedd";
ALTER TABLE ONLY public.order_modification DROP CONSTRAINT "FK_ad2991fa2933ed8b7f86a716338";
ALTER TABLE ONLY public.customer_channels_channel DROP CONSTRAINT "FK_a842c9fe8cd4c8ff31402d172d7";
ALTER TABLE ONLY public.product_option_translation DROP CONSTRAINT "FK_a79a443c1f7841f3851767faa6d";
ALTER TABLE ONLY public.product_option_group DROP CONSTRAINT "FK_a6e91739227bf4d442f23c52c75";
ALTER TABLE ONLY public.product_option DROP CONSTRAINT "FK_a6debf9198e2fbfa006aa10d710";
ALTER TABLE ONLY public.product_channels_channel DROP CONSTRAINT "FK_a51dfbd87c330c075c39832b6e7";
ALTER TABLE ONLY public.surcharge DROP CONSTRAINT "FK_a49c5271c39cc8174a0535c8088";
ALTER TABLE ONLY public.stock_movement DROP CONSTRAINT "FK_a2fe7172eeae9f1cca86f8f573a";
ALTER TABLE ONLY public.order_line DROP CONSTRAINT "FK_9f065453910ea77d4be8e92618f";
ALTER TABLE ONLY public.asset_tags_tag DROP CONSTRAINT "FK_9e412b00d4c6cee1a4b3d920716";
ALTER TABLE ONLY public.stock_level DROP CONSTRAINT "FK_9950eae3180f39c71978748bd08";
ALTER TABLE ONLY public.tax_rate DROP CONSTRAINT "FK_9872fc7de2f4e532fd3230d1915";
ALTER TABLE ONLY public.stock_level DROP CONSTRAINT "FK_984c48572468c69661a0b7b0494";
ALTER TABLE ONLY public.product_option_group_translation DROP CONSTRAINT "FK_93751abc1451972c02e033b766c";
ALTER TABLE ONLY public.history_entry DROP CONSTRAINT "FK_92f8c334ef06275f9586fd01832";
ALTER TABLE ONLY public.product DROP CONSTRAINT "FK_91a19e6613534949a4ce6e76ff8";
ALTER TABLE ONLY public.tax_rate DROP CONSTRAINT "FK_8b5ab52fc8887c1a769b9276caf";
ALTER TABLE ONLY public.customer_groups_customer_group DROP CONSTRAINT "FK_85feea3f0e5e82133605f78db02";
ALTER TABLE ONLY public.shipping_method_translation DROP CONSTRAINT "FK_85ec26c71067ebc84adcd98d1a5";
ALTER TABLE ONLY public.tax_rate DROP CONSTRAINT "FK_7ee3306d7638aa85ca90d672198";
ALTER TABLE ONLY public.product_translation DROP CONSTRAINT "FK_7dbc75cb4e8b002620c4dbfdac5";
ALTER TABLE ONLY public.order_line_reference DROP CONSTRAINT "FK_7d57857922dfc7303604697dbe9";
ALTER TABLE ONLY public.session DROP CONSTRAINT "FK_7a75399a4f4ffa48ee02e98c059";
ALTER TABLE ONLY public.order_line DROP CONSTRAINT "FK_77be94ce9ec6504466179462275";
ALTER TABLE ONLY public."order" DROP CONSTRAINT "FK_73a78d7df09541ac5eba620d181";
ALTER TABLE ONLY public.collection DROP CONSTRAINT "FK_7256fef1bb42f1b38156b7449f5";
ALTER TABLE ONLY public.collection_channels_channel DROP CONSTRAINT "FK_7216ab24077cf5cbece7857dbbd";
ALTER TABLE ONLY public.collection_product_variants_product_variant DROP CONSTRAINT "FK_6faa7b72422d9c4679e2f186ad1";
ALTER TABLE ONLY public.product_variant DROP CONSTRAINT "FK_6e420052844edf3a5506d863ce6";
ALTER TABLE ONLY public.promotion_channels_channel DROP CONSTRAINT "FK_6d9e2c39ab12391aaa374bcdaa4";
ALTER TABLE ONLY public.product_facet_values_facet_value DROP CONSTRAINT "FK_6a0558e650d75ae639ff38e413a";
ALTER TABLE ONLY public.product_variant_facet_values_facet_value DROP CONSTRAINT "FK_69567bc225b6bbbd732d6c5455b";
ALTER TABLE ONLY public.order_line DROP CONSTRAINT "FK_6901d8715f5ebadd764466f7bde";
ALTER TABLE ONLY public.order_promotions_promotion DROP CONSTRAINT "FK_67be0e40122ab30a62a9817efe0";
ALTER TABLE ONLY public.payment_method_translation DROP CONSTRAINT "FK_66187f782a3e71b9e0f5b50b68b";
ALTER TABLE ONLY public.user_roles_role DROP CONSTRAINT "FK_5f9286e6c25594c6b88c108db77";
ALTER TABLE ONLY public.payment_method_channels_channel DROP CONSTRAINT "FK_5bcb569635ce5407eb3f264487d";
ALTER TABLE ONLY public.product_asset DROP CONSTRAINT "FK_5888ac17b317b93378494a10620";
ALTER TABLE ONLY public.product_variant_options_product_option DROP CONSTRAINT "FK_526f0131260eec308a3bd2b61b6";
ALTER TABLE ONLY public.collection_asset DROP CONSTRAINT "FK_51da53b26522dc0525762d2de8e";
ALTER TABLE ONLY public.user_roles_role DROP CONSTRAINT "FK_4be2f7adf862634f5f803d246b8";
ALTER TABLE ONLY public.order_fulfillments_fulfillment DROP CONSTRAINT "FK_4add5a5796e1582dec2877b2898";
ALTER TABLE ONLY public.collection_closure DROP CONSTRAINT "FK_457784c710f8ac9396010441f6c";
ALTER TABLE ONLY public.history_entry DROP CONSTRAINT "FK_43ac602f839847fdb91101f30ec";
ALTER TABLE ONLY public.zone_members_region DROP CONSTRAINT "FK_433f45158e4e2b2a2f344714b22";
ALTER TABLE ONLY public.collection DROP CONSTRAINT "FK_4257b61275144db89fa0f5dc059";
ALTER TABLE ONLY public.product_variant_translation DROP CONSTRAINT "FK_420f4d6fb75d38b9dca79bc43b4";
ALTER TABLE ONLY public.customer DROP CONSTRAINT "FK_3f62b42ed23958b120c235f74df";
ALTER TABLE ONLY public.facet_value_translation DROP CONSTRAINT "FK_3d6e45823b65de808a66cb1423b";
ALTER TABLE ONLY public.session DROP CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53";
ALTER TABLE ONLY public.history_entry DROP CONSTRAINT "FK_3a05127e67435b4d2332ded7c9e";
ALTER TABLE ONLY public.stock_location_channels_channel DROP CONSTRAINT "FK_39513fd02a573c848d23bee587d";
ALTER TABLE ONLY public.order_line_reference DROP CONSTRAINT "FK_30019aa65b17fe9ee9628931991";
ALTER TABLE ONLY public.order_promotions_promotion DROP CONSTRAINT "FK_2c26b988769c0e3b0120bdef31b";
ALTER TABLE ONLY public.facet_channels_channel DROP CONSTRAINT "FK_2a8ea404d05bf682516184db7d3";
ALTER TABLE ONLY public.product_channels_channel DROP CONSTRAINT "FK_26d12be3b5fec6c4adb1d792844";
ALTER TABLE ONLY public.order_line DROP CONSTRAINT "FK_239cfca2a55b98b90b6bef2e44f";
ALTER TABLE ONLY public.order_line_reference DROP CONSTRAINT "FK_22b818af8722746fb9f206068c2";
ALTER TABLE ONLY public.collection_asset DROP CONSTRAINT "FK_1ed9e48dfbf74b5fcbb35d3d686";
ALTER TABLE ONLY public.order_modification DROP CONSTRAINT "FK_1df5bc14a47ef24d2e681f45598";
ALTER TABLE ONLY public.promotion_translation DROP CONSTRAINT "FK_1cc009e9ab2263a35544064561b";
ALTER TABLE ONLY public.refund DROP CONSTRAINT "FK_1c6932a756108788a361e7d4404";
ALTER TABLE ONLY public.region_translation DROP CONSTRAINT "FK_1afd722b943c81310705fc3e612";
ALTER TABLE ONLY public.administrator DROP CONSTRAINT "FK_1966e18ce6a39a82b19204704d7";
ALTER TABLE ONLY public.asset_channels_channel DROP CONSTRAINT "FK_16ca9151a5153f1169da5b7b7e3";
ALTER TABLE ONLY public.surcharge DROP CONSTRAINT "FK_154eb685f9b629033bd266df7fa";
ALTER TABLE ONLY public."order" DROP CONSTRAINT "FK_124456e637cca7a415897dce659";
ALTER TABLE ONLY public.product_variant_asset DROP CONSTRAINT "FK_10b5a2e3dee0e30b1e26c32f5c7";
ALTER TABLE ONLY public.promotion_channels_channel DROP CONSTRAINT "FK_0eaaf0f4b6c69afde1e88ffb52d";
ALTER TABLE ONLY public.product_variant DROP CONSTRAINT "FK_0e6f516053cf982b537836e21cf";
ALTER TABLE ONLY public.order_channels_channel DROP CONSTRAINT "FK_0d8e5c204480204a60e151e4853";
ALTER TABLE ONLY public.product_variant_facet_values_facet_value DROP CONSTRAINT "FK_0d641b761ed1dce4ef3cd33d559";
ALTER TABLE ONLY public.product_asset DROP CONSTRAINT "FK_0d1294f5c22a56da7845ebab72c";
ALTER TABLE ONLY public.product_facet_values_facet_value DROP CONSTRAINT "FK_06e7d73673ee630e8ec50d0b29f";
ALTER TABLE ONLY public.order_line_reference DROP CONSTRAINT "FK_06b02fb482b188823e419d37bd4";
ALTER TABLE ONLY public.authentication_method DROP CONSTRAINT "FK_00cbe87bc0d4e36758d61bd31d6";
DROP INDEX public.idx_product_variant_updated_at;
DROP INDEX public.idx_product_variant_sku;
DROP INDEX public.idx_product_variant_enabled;
DROP INDEX public.idx_product_variant_deleted_at;
DROP INDEX public.idx_product_variant_created_at;
DROP INDEX public.idx_product_updated_at;
DROP INDEX public.idx_product_enabled;
DROP INDEX public.idx_product_deleted_at;
DROP INDEX public.idx_product_created_at;
DROP INDEX public.idx_order_updated_at;
DROP INDEX public.idx_order_state;
DROP INDEX public.idx_order_created_at;
DROP INDEX public.idx_order_active;
DROP INDEX public.idx_customer_updated_at;
DROP INDEX public.idx_customer_email;
DROP INDEX public.idx_customer_deleted_at;
DROP INDEX public.idx_customer_created_at;
DROP INDEX public.idx_asset_name;
DROP INDEX public.idx_asset_created_at;
DROP INDEX public."IDX_ff8150fe54e56a900d5712671a";
DROP INDEX public."IDX_fb5e800171ffbe9823f2cc727f";
DROP INDEX public."IDX_fb05887e2867365f236d7dd95e";
DROP INDEX public."IDX_fa21412afac15a2304f3eb35fe";
DROP INDEX public."IDX_f80d84d525af2ffe974e7e8ca2";
DROP INDEX public."IDX_f4a2ec16ba86d277b6faa0b67b";
DROP INDEX public."IDX_f2b98dfb56685147bed509acc3";
DROP INDEX public."IDX_f0a17b94aa5a162f0d422920eb";
DROP INDEX public."IDX_ed0c8098ce6809925a437f42ae";
DROP INDEX public."IDX_eb87ef1e234444728138302263";
DROP INDEX public."IDX_eaea53f44bf9e97790d38a3d68";
DROP INDEX public."IDX_e96a71affe63c97f7fa2f076da";
DROP INDEX public."IDX_e65ba3882557cab4febb54809b";
DROP INDEX public."IDX_e6126cd268aea6e9b31d89af9a";
DROP INDEX public."IDX_e38dca0d82fd64c7cf8aac8b8e";
DROP INDEX public."IDX_e329f9036210d75caa1d8f2154";
DROP INDEX public."IDX_e2e7642e1e88167c1dfc827fdf";
DROP INDEX public."IDX_e1d54c0b9db3e2eb17faaf5919";
DROP INDEX public."IDX_e09dfee62b158307404202b43a";
DROP INDEX public."IDX_dc9f69207a8867f83b0fd257e3";
DROP INDEX public."IDX_dc9ac68b47da7b62249886affb";
DROP INDEX public."IDX_dc4e7435f9f5e9e6436bebd33b";
DROP INDEX public."IDX_dc34d382b493ade1f70e834c4d";
DROP INDEX public."IDX_d8791f444a8bf23fe4c1bc020c";
DROP INDEX public."IDX_d87215343c3a3a67e6a0b7f3ea";
DROP INDEX public."IDX_d2c8d5fca981cc820131f81aa8";
DROP INDEX public."IDX_d194bff171b62357688a5d0f55";
DROP INDEX public."IDX_d101dc2265a7341be3d94968c5";
DROP INDEX public."IDX_d0d16db872499e83b15999f8c7";
DROP INDEX public."IDX_d09d285fe1645cd2f0db811e29";
DROP INDEX public."IDX_cdbf33ffb5d451916125152008";
DROP INDEX public."IDX_cbcd22193eda94668e84d33f18";
DROP INDEX public."IDX_ca796020c6d097e251e5d6d2b0";
DROP INDEX public."IDX_c9f34a440d490d1b66f6829b86";
DROP INDEX public."IDX_c9ca2f58d4517460435cbd8b4c";
DROP INDEX public."IDX_c309f8cd152bbeaea08491e0c6";
DROP INDEX public."IDX_c00e36f667d35031087b382e61";
DROP INDEX public."IDX_bfd2a03e9988eda6a9d1176011";
DROP INDEX public."IDX_beeb2b3cd800e589f2213ae99d";
DROP INDEX public."IDX_b823a3c8bf3b78d3ed68736485";
DROP INDEX public."IDX_b45b65256486a15a104e17d495";
DROP INDEX public."IDX_afe9f917a1c82b9e9e69f7c612";
DROP INDEX public."IDX_af2116c7e176b6b88dceceeb74";
DROP INDEX public."IDX_ad690c1b05596d7f52e52ffeed";
DROP INDEX public."IDX_a842c9fe8cd4c8ff31402d172d";
DROP INDEX public."IDX_a79a443c1f7841f3851767faa6";
DROP INDEX public."IDX_a6e91739227bf4d442f23c52c7";
DROP INDEX public."IDX_a6debf9198e2fbfa006aa10d71";
DROP INDEX public."IDX_a51dfbd87c330c075c39832b6e";
DROP INDEX public."IDX_a49c5271c39cc8174a0535c808";
DROP INDEX public."IDX_a2fe7172eeae9f1cca86f8f573";
DROP INDEX public."IDX_a23445b2c942d8dfcae15b8de2";
DROP INDEX public."IDX_9f9da7d94b0278ea0f7831e1fc";
DROP INDEX public."IDX_9f065453910ea77d4be8e92618";
DROP INDEX public."IDX_9e412b00d4c6cee1a4b3d92071";
DROP INDEX public."IDX_9a5a6a556f75c4ac7bfdd03410";
DROP INDEX public."IDX_9950eae3180f39c71978748bd0";
DROP INDEX public."IDX_9872fc7de2f4e532fd3230d191";
DROP INDEX public."IDX_984c48572468c69661a0b7b049";
DROP INDEX public."IDX_93751abc1451972c02e033b766";
DROP INDEX public."IDX_92f8c334ef06275f9586fd0183";
DROP INDEX public."IDX_91a19e6613534949a4ce6e76ff";
DROP INDEX public."IDX_8b5ab52fc8887c1a769b9276ca";
DROP INDEX public."IDX_85feea3f0e5e82133605f78db0";
DROP INDEX public."IDX_85ec26c71067ebc84adcd98d1a";
DROP INDEX public."IDX_7fc20486b8cfd33dc84c96e168";
DROP INDEX public."IDX_7ee3306d7638aa85ca90d67219";
DROP INDEX public."IDX_7dbc75cb4e8b002620c4dbfdac";
DROP INDEX public."IDX_7d57857922dfc7303604697dbe";
DROP INDEX public."IDX_7a75399a4f4ffa48ee02e98c05";
DROP INDEX public."IDX_77be94ce9ec650446617946227";
DROP INDEX public."IDX_73a78d7df09541ac5eba620d18";
DROP INDEX public."IDX_729b3eea7ce540930dbb706949";
DROP INDEX public."IDX_7256fef1bb42f1b38156b7449f";
DROP INDEX public."IDX_7216ab24077cf5cbece7857dbb";
DROP INDEX public."IDX_6fb55742e13e8082954d0436dc";
DROP INDEX public."IDX_6faa7b72422d9c4679e2f186ad";
DROP INDEX public."IDX_6e420052844edf3a5506d863ce";
DROP INDEX public."IDX_6d9e2c39ab12391aaa374bcdaa";
DROP INDEX public."IDX_6a0558e650d75ae639ff38e413";
DROP INDEX public."IDX_69567bc225b6bbbd732d6c5455";
DROP INDEX public."IDX_6901d8715f5ebadd764466f7bd";
DROP INDEX public."IDX_67be0e40122ab30a62a9817efe";
DROP INDEX public."IDX_66187f782a3e71b9e0f5b50b68";
DROP INDEX public."IDX_5f9286e6c25594c6b88c108db7";
DROP INDEX public."IDX_5bcb569635ce5407eb3f264487";
DROP INDEX public."IDX_5888ac17b317b93378494a1062";
DROP INDEX public."IDX_526f0131260eec308a3bd2b61b";
DROP INDEX public."IDX_51da53b26522dc0525762d2de8";
DROP INDEX public."IDX_4be2f7adf862634f5f803d246b";
DROP INDEX public."IDX_4add5a5796e1582dec2877b289";
DROP INDEX public."IDX_49a8632be8cef48b076446b8b9";
DROP INDEX public."IDX_457784c710f8ac9396010441f6";
DROP INDEX public."IDX_43ac602f839847fdb91101f30e";
DROP INDEX public."IDX_433f45158e4e2b2a2f344714b2";
DROP INDEX public."IDX_420f4d6fb75d38b9dca79bc43b";
DROP INDEX public."IDX_3d6e45823b65de808a66cb1423";
DROP INDEX public."IDX_3d2f174ef04fb312fdebd0ddc5";
DROP INDEX public."IDX_3a05127e67435b4d2332ded7c9";
DROP INDEX public."IDX_39513fd02a573c848d23bee587";
DROP INDEX public."IDX_30019aa65b17fe9ee962893199";
DROP INDEX public."IDX_2c26b988769c0e3b0120bdef31";
DROP INDEX public."IDX_2a8ea404d05bf682516184db7d";
DROP INDEX public."IDX_26d12be3b5fec6c4adb1d79284";
DROP INDEX public."IDX_239cfca2a55b98b90b6bef2e44";
DROP INDEX public."IDX_232f8e85d7633bd6ddfad42169";
DROP INDEX public."IDX_22b818af8722746fb9f206068c";
DROP INDEX public."IDX_1ed9e48dfbf74b5fcbb35d3d68";
DROP INDEX public."IDX_1df5bc14a47ef24d2e681f4559";
DROP INDEX public."IDX_1cc009e9ab2263a35544064561";
DROP INDEX public."IDX_1c6932a756108788a361e7d440";
DROP INDEX public."IDX_1afd722b943c81310705fc3e61";
DROP INDEX public."IDX_16ca9151a5153f1169da5b7b7e";
DROP INDEX public."IDX_154eb685f9b629033bd266df7f";
DROP INDEX public."IDX_124456e637cca7a415897dce65";
DROP INDEX public."IDX_10b5a2e3dee0e30b1e26c32f5c";
DROP INDEX public."IDX_0eaaf0f4b6c69afde1e88ffb52";
DROP INDEX public."IDX_0e6f516053cf982b537836e21c";
DROP INDEX public."IDX_0d8e5c204480204a60e151e485";
DROP INDEX public."IDX_0d641b761ed1dce4ef3cd33d55";
DROP INDEX public."IDX_0d1294f5c22a56da7845ebab72";
DROP INDEX public."IDX_06e7d73673ee630e8ec50d0b29";
DROP INDEX public."IDX_06b02fb482b188823e419d37bd";
DROP INDEX public."IDX_00cbe87bc0d4e36758d61bd31d";
ALTER TABLE ONLY public.channel DROP CONSTRAINT "UQ_842699fce4f3470a7d06d89de88";
ALTER TABLE ONLY public.scheduled_task_record DROP CONSTRAINT "UQ_661876d97056cad9fd37eaa8774";
ALTER TABLE ONLY public.administrator DROP CONSTRAINT "UQ_154f5c538b1576ccc277b1ed631";
ALTER TABLE ONLY public.facet DROP CONSTRAINT "UQ_0c9a5d053fdf4ebb5f0490b40fd";
ALTER TABLE ONLY public.channel DROP CONSTRAINT "UQ_06127ac6c6d913f4320759971db";
ALTER TABLE ONLY public.order_modification DROP CONSTRAINT "REL_cb66b63b6e97613013795eadbd";
ALTER TABLE ONLY public.order_modification DROP CONSTRAINT "REL_ad2991fa2933ed8b7f86a71633";
ALTER TABLE ONLY public.customer DROP CONSTRAINT "REL_3f62b42ed23958b120c235f74d";
ALTER TABLE ONLY public.administrator DROP CONSTRAINT "REL_1966e18ce6a39a82b19204704d";
ALTER TABLE ONLY public.global_settings DROP CONSTRAINT "PK_fec5e2c0bf238e30b25d4a82976";
ALTER TABLE ONLY public.payment DROP CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab";
ALTER TABLE ONLY public.zone_members_region DROP CONSTRAINT "PK_fc4eaa2236c4d4f61db0ae3826f";
ALTER TABLE ONLY public.promotion DROP CONSTRAINT "PK_fab3630e0789a2002f1cadb7d38";
ALTER TABLE ONLY public.session DROP CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11";
ALTER TABLE ONLY public.refund DROP CONSTRAINT "PK_f1cefa2e60d99b206c46c1116e5";
ALTER TABLE ONLY public.scheduled_task_record DROP CONSTRAINT "PK_efd4b61a3b227f3eba94de32e4c";
ALTER TABLE ONLY public.administrator DROP CONSTRAINT "PK_ee58e71b3b4008b20ddc7b3092b";
ALTER TABLE ONLY public.stock_location_channels_channel DROP CONSTRAINT "PK_e6f8b2d61ff58c51505c38da8a0";
ALTER TABLE ONLY public.authentication_method DROP CONSTRAINT "PK_e204686018c3c60f6164e385081";
ALTER TABLE ONLY public.facet_channels_channel DROP CONSTRAINT "PK_df0579886093b2f830c159adfde";
ALTER TABLE ONLY public.asset_channels_channel DROP CONSTRAINT "PK_d943908a39e32952e8425d2f1ba";
ALTER TABLE ONLY public.address DROP CONSTRAINT "PK_d92de1f82754668b5f5f5dd4fd5";
ALTER TABLE ONLY public.product_option_group DROP CONSTRAINT "PK_d76e92fdbbb5a2e6752ffd4a2c1";
ALTER TABLE ONLY public.product_facet_values_facet_value DROP CONSTRAINT "PK_d57f06b38805181019d75662aa6";
ALTER TABLE ONLY public.facet_value DROP CONSTRAINT "PK_d231e8eecc7e1a6059e1da7d325";
ALTER TABLE ONLY public.order_modification DROP CONSTRAINT "PK_cccf2e1612694eeb1e5b6760ffa";
ALTER TABLE ONLY public.product_variant_asset DROP CONSTRAINT "PK_cb1e33ae13779da176f8b03a5d3";
ALTER TABLE ONLY public."user" DROP CONSTRAINT "PK_cace4a159ff9f2512dd42373760";
ALTER TABLE ONLY public.shipping_method_channels_channel DROP CONSTRAINT "PK_c92b2b226a6ee87888d8dcd8bd6";
ALTER TABLE ONLY public.payment_method_channels_channel DROP CONSTRAINT "PK_c83e4a201c0402ce5cdb170a9a2";
ALTER TABLE ONLY public.product_variant_options_product_option DROP CONSTRAINT "PK_c57de5cb6bb74504180604a00c0";
ALTER TABLE ONLY public.product_asset DROP CONSTRAINT "PK_c56a83efd14ec4175532e1867fc";
ALTER TABLE ONLY public.asset_tags_tag DROP CONSTRAINT "PK_c4113b84381e953901fa5553654";
ALTER TABLE ONLY public.product DROP CONSTRAINT "PK_bebc9158e480b949565b4dc7a82";
ALTER TABLE ONLY public.zone DROP CONSTRAINT "PK_bd3989e5a3c3fb5ed546dfaf832";
ALTER TABLE ONLY public.collection_translation DROP CONSTRAINT "PK_bb49cfcde50401eb5f463a84dac";
ALTER TABLE ONLY public.product_variant_price DROP CONSTRAINT "PK_ba659ff2940702124e799c5c854";
ALTER TABLE ONLY public.shipping_method DROP CONSTRAINT "PK_b9b0adfad3c6b99229c1e7d4865";
ALTER TABLE ONLY public.shipping_method_translation DROP CONSTRAINT "PK_b862a1fac1c6e1fd201eadadbcb";
ALTER TABLE ONLY public.history_entry DROP CONSTRAINT "PK_b65bd95b0d2929668589d57b97a";
ALTER TABLE ONLY public.user_roles_role DROP CONSTRAINT "PK_b47cd6c84ee205ac5a713718292";
ALTER TABLE ONLY public.role DROP CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2";
ALTER TABLE ONLY public.payment_method_translation DROP CONSTRAINT "PK_ae5ae0af71ae8d15da9eb75768b";
ALTER TABLE ONLY public.stock_location DROP CONSTRAINT "PK_adf770067d0df1421f525fa25cc";
ALTER TABLE ONLY public.collection DROP CONSTRAINT "PK_ad3f485bbc99d875491f44d7c85";
ALTER TABLE ONLY public.customer DROP CONSTRAINT "PK_a7a13f4cacb744524e44dfdad32";
ALTER TABLE ONLY public.facet_translation DROP CONSTRAINT "PK_a6902cc1dcbb5e52a980f0189ad";
ALTER TABLE ONLY public.surcharge DROP CONSTRAINT "PK_a62b89257bcc802b5d77346f432";
ALTER TABLE ONLY public.collection_asset DROP CONSTRAINT "PK_a2adab6fd086adfb7858f1f110c";
ALTER TABLE ONLY public.product_variant_facet_values_facet_value DROP CONSTRAINT "PK_a28474836b2feeffcef98c806e1";
ALTER TABLE ONLY public.facet DROP CONSTRAINT "PK_a0ebfe3c68076820c6886aa9ff3";
ALTER TABLE ONLY public.facet_value_translation DROP CONSTRAINT "PK_a09fdeb788deff7a9ed827a6160";
ALTER TABLE ONLY public.stock_movement DROP CONSTRAINT "PK_9fe1232f916686ae8cf00294749";
ALTER TABLE ONLY public.collection_closure DROP CONSTRAINT "PK_9dda38e2273a7744b8f655782a5";
ALTER TABLE ONLY public.job_record_buffer DROP CONSTRAINT "PK_9a1cfa02511065b32053efceeff";
ALTER TABLE ONLY public.tag DROP CONSTRAINT "PK_8e4052373c579afc1471f526760";
ALTER TABLE ONLY public.migrations DROP CONSTRAINT "PK_8c82d7f526340ab734260ea46be";
ALTER TABLE ONLY public.shipping_line DROP CONSTRAINT "PK_890522bfc44a4b6eb7cb1e52609";
ALTER TABLE ONLY public.stock_level DROP CONSTRAINT "PK_88ff7d9dfb57dc9d435e365eb69";
ALTER TABLE ONLY public.customer_group DROP CONSTRAINT "PK_88e7da3ff7262d9e0a35aa3664e";
ALTER TABLE ONLY public.job_record DROP CONSTRAINT "PK_88ce3ea0c9dca8b571450b457a7";
ALTER TABLE ONLY public.payment_method DROP CONSTRAINT "PK_7744c2b2dd932c9cf42f2b9bc3a";
ALTER TABLE ONLY public.product_channels_channel DROP CONSTRAINT "PK_722acbcc06403e693b518d2c345";
ALTER TABLE ONLY public.role_channels_channel DROP CONSTRAINT "PK_6fb9277e9f11bb8a63445c36242";
ALTER TABLE ONLY public.product_option_translation DROP CONSTRAINT "PK_69c79a84baabcad3c7328576ac0";
ALTER TABLE ONLY public.facet_value_channels_channel DROP CONSTRAINT "PK_653fb72a256f100f52c573e419f";
ALTER TABLE ONLY public.search_index_item DROP CONSTRAINT "PK_6470dd173311562c89e5f80b30e";
ALTER TABLE ONLY public.product_translation DROP CONSTRAINT "PK_62d00fbc92e7a495701d6fee9d5";
ALTER TABLE ONLY public.region DROP CONSTRAINT "PK_5f48ffc3af96bc486f5f3f3a6da";
ALTER TABLE ONLY public.channel DROP CONSTRAINT "PK_590f33ee6ee7d76437acf362e39";
ALTER TABLE ONLY public.collection_product_variants_product_variant DROP CONSTRAINT "PK_50c5ed0504ded53967be811f633";
ALTER TABLE ONLY public.fulfillment DROP CONSTRAINT "PK_50c102da132afffae660585981f";
ALTER TABLE ONLY public.product_option DROP CONSTRAINT "PK_4cf3c467e9bc764bdd32c4cd938";
ALTER TABLE ONLY public.product_variant_translation DROP CONSTRAINT "PK_4b7f882e2b669800bed7ed065f0";
ALTER TABLE ONLY public.promotion_channels_channel DROP CONSTRAINT "PK_4b34f9b7bf95a8d3dc7f7f6dd23";
ALTER TABLE ONLY public.product_option_group_translation DROP CONSTRAINT "PK_44ab19f118175288dff147c4a00";
ALTER TABLE ONLY public.order_fulfillments_fulfillment DROP CONSTRAINT "PK_414600087d71aee1583bc517590";
ALTER TABLE ONLY public.region_translation DROP CONSTRAINT "PK_3e0c9619cafbe579eeecfd88abc";
ALTER TABLE ONLY public.order_channels_channel DROP CONSTRAINT "PK_39853134b20afe9dfb25de18292";
ALTER TABLE ONLY public.seller DROP CONSTRAINT "PK_36445a9c6e794945a4a4a8d3c9d";
ALTER TABLE ONLY public.customer_channels_channel DROP CONSTRAINT "PK_27e2fa538c020889d32a0a784e8";
ALTER TABLE ONLY public.tax_category DROP CONSTRAINT "PK_2432988f825c336d5584a96cded";
ALTER TABLE ONLY public.tax_rate DROP CONSTRAINT "PK_23b71b53f650c0b39e99ccef4fd";
ALTER TABLE ONLY public.order_line_reference DROP CONSTRAINT "PK_21891d07accb8fa87e11165bca2";
ALTER TABLE ONLY public.product_variant DROP CONSTRAINT "PK_1ab69c9935c61f7c70791ae0a9f";
ALTER TABLE ONLY public.product_variant_channels_channel DROP CONSTRAINT "PK_1a10ca648c3d73c0f2b455ae191";
ALTER TABLE ONLY public.asset DROP CONSTRAINT "PK_1209d107fe21482beaea51b745e";
ALTER TABLE ONLY public."order" DROP CONSTRAINT "PK_1031171c13130102495201e3e20";
ALTER TABLE ONLY public.customer_groups_customer_group DROP CONSTRAINT "PK_0f902789cba691ce7ebbc9fcaa6";
ALTER TABLE ONLY public.collection_channels_channel DROP CONSTRAINT "PK_0e292d80228c9b4a114d2b09476";
ALTER TABLE ONLY public.promotion_translation DROP CONSTRAINT "PK_0b4fd34d2fc7abc06189494a178";
ALTER TABLE ONLY public.order_line DROP CONSTRAINT "PK_01a7c973d9f30479647e44f9892";
ALTER TABLE ONLY public.order_promotions_promotion DROP CONSTRAINT "PK_001dfe7435f3946fbc2d66a4e92";
ALTER TABLE public.zone ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."user" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.tax_rate ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.tax_category ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.tag ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.surcharge ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stock_movement ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stock_location ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stock_level ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.shipping_method_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.shipping_method ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.shipping_line ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.session ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.seller ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.scheduled_task_record ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.role ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.region_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.region ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.refund ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.promotion_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.promotion ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_variant_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_variant_price ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_variant_asset ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_variant ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_option_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_option_group_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_option_group ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_option ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product_asset ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.product ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.payment_method_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.payment_method ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.payment ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.order_modification ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.order_line_reference ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.order_line ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public."order" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.migrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.job_record_buffer ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.job_record ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.history_entry ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.global_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.fulfillment ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.facet_value_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.facet_value ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.facet_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.facet ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.customer_group ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.customer ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.collection_translation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.collection_asset ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.collection ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.channel ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.authentication_method ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.asset ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.administrator ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.address ALTER COLUMN id DROP DEFAULT;
DROP TABLE public.zone_members_region;
DROP SEQUENCE public.zone_id_seq;
DROP TABLE public.zone;
DROP TABLE public.user_roles_role;
DROP SEQUENCE public.user_id_seq;
DROP TABLE public."user";
DROP SEQUENCE public.tax_rate_id_seq;
DROP TABLE public.tax_rate;
DROP SEQUENCE public.tax_category_id_seq;
DROP TABLE public.tax_category;
DROP SEQUENCE public.tag_id_seq;
DROP TABLE public.tag;
DROP SEQUENCE public.surcharge_id_seq;
DROP TABLE public.surcharge;
DROP SEQUENCE public.stock_movement_id_seq;
DROP TABLE public.stock_movement;
DROP SEQUENCE public.stock_location_id_seq;
DROP TABLE public.stock_location_channels_channel;
DROP TABLE public.stock_location;
DROP SEQUENCE public.stock_level_id_seq;
DROP TABLE public.stock_level;
DROP SEQUENCE public.shipping_method_translation_id_seq;
DROP TABLE public.shipping_method_translation;
DROP SEQUENCE public.shipping_method_id_seq;
DROP TABLE public.shipping_method_channels_channel;
DROP TABLE public.shipping_method;
DROP SEQUENCE public.shipping_line_id_seq;
DROP TABLE public.shipping_line;
DROP SEQUENCE public.session_id_seq;
DROP TABLE public.session;
DROP SEQUENCE public.seller_id_seq;
DROP TABLE public.seller;
DROP TABLE public.search_index_item;
DROP SEQUENCE public.scheduled_task_record_id_seq;
DROP TABLE public.scheduled_task_record;
DROP SEQUENCE public.role_id_seq;
DROP TABLE public.role_channels_channel;
DROP TABLE public.role;
DROP SEQUENCE public.region_translation_id_seq;
DROP TABLE public.region_translation;
DROP SEQUENCE public.region_id_seq;
DROP TABLE public.region;
DROP SEQUENCE public.refund_id_seq;
DROP TABLE public.refund;
DROP SEQUENCE public.promotion_translation_id_seq;
DROP TABLE public.promotion_translation;
DROP SEQUENCE public.promotion_id_seq;
DROP TABLE public.promotion_channels_channel;
DROP TABLE public.promotion;
DROP SEQUENCE public.product_variant_translation_id_seq;
DROP TABLE public.product_variant_translation;
DROP SEQUENCE public.product_variant_price_id_seq;
DROP TABLE public.product_variant_price;
DROP TABLE public.product_variant_options_product_option;
DROP SEQUENCE public.product_variant_id_seq;
DROP TABLE public.product_variant_facet_values_facet_value;
DROP TABLE public.product_variant_channels_channel;
DROP SEQUENCE public.product_variant_asset_id_seq;
DROP TABLE public.product_variant_asset;
DROP TABLE public.product_variant;
DROP SEQUENCE public.product_translation_id_seq;
DROP TABLE public.product_translation;
DROP SEQUENCE public.product_option_translation_id_seq;
DROP TABLE public.product_option_translation;
DROP SEQUENCE public.product_option_id_seq;
DROP SEQUENCE public.product_option_group_translation_id_seq;
DROP TABLE public.product_option_group_translation;
DROP SEQUENCE public.product_option_group_id_seq;
DROP TABLE public.product_option_group;
DROP TABLE public.product_option;
DROP SEQUENCE public.product_id_seq;
DROP TABLE public.product_facet_values_facet_value;
DROP TABLE public.product_channels_channel;
DROP SEQUENCE public.product_asset_id_seq;
DROP TABLE public.product_asset;
DROP TABLE public.product;
DROP SEQUENCE public.payment_method_translation_id_seq;
DROP TABLE public.payment_method_translation;
DROP SEQUENCE public.payment_method_id_seq;
DROP TABLE public.payment_method_channels_channel;
DROP TABLE public.payment_method;
DROP SEQUENCE public.payment_id_seq;
DROP TABLE public.payment;
DROP TABLE public.order_promotions_promotion;
DROP SEQUENCE public.order_modification_id_seq;
DROP TABLE public.order_modification;
DROP SEQUENCE public.order_line_reference_id_seq;
DROP TABLE public.order_line_reference;
DROP SEQUENCE public.order_line_id_seq;
DROP TABLE public.order_line;
DROP SEQUENCE public.order_id_seq;
DROP TABLE public.order_fulfillments_fulfillment;
DROP TABLE public.order_channels_channel;
DROP TABLE public."order";
DROP SEQUENCE public.migrations_id_seq;
DROP TABLE public.migrations;
DROP SEQUENCE public.job_record_id_seq;
DROP SEQUENCE public.job_record_buffer_id_seq;
DROP TABLE public.job_record_buffer;
DROP TABLE public.job_record;
DROP SEQUENCE public.history_entry_id_seq;
DROP TABLE public.history_entry;
DROP SEQUENCE public.global_settings_id_seq;
DROP TABLE public.global_settings;
DROP SEQUENCE public.fulfillment_id_seq;
DROP TABLE public.fulfillment;
DROP SEQUENCE public.facet_value_translation_id_seq;
DROP TABLE public.facet_value_translation;
DROP SEQUENCE public.facet_value_id_seq;
DROP TABLE public.facet_value_channels_channel;
DROP TABLE public.facet_value;
DROP SEQUENCE public.facet_translation_id_seq;
DROP TABLE public.facet_translation;
DROP SEQUENCE public.facet_id_seq;
DROP TABLE public.facet_channels_channel;
DROP TABLE public.facet;
DROP SEQUENCE public.customer_id_seq;
DROP TABLE public.customer_groups_customer_group;
DROP SEQUENCE public.customer_group_id_seq;
DROP TABLE public.customer_group;
DROP TABLE public.customer_channels_channel;
DROP TABLE public.customer;
DROP SEQUENCE public.collection_translation_id_seq;
DROP TABLE public.collection_translation;
DROP TABLE public.collection_product_variants_product_variant;
DROP SEQUENCE public.collection_id_seq;
DROP TABLE public.collection_closure;
DROP TABLE public.collection_channels_channel;
DROP SEQUENCE public.collection_asset_id_seq;
DROP TABLE public.collection_asset;
DROP TABLE public.collection;
DROP SEQUENCE public.channel_id_seq;
DROP TABLE public.channel;
DROP SEQUENCE public.authentication_method_id_seq;
DROP TABLE public.authentication_method;
DROP TABLE public.asset_tags_tag;
DROP SEQUENCE public.asset_id_seq;
DROP TABLE public.asset_channels_channel;
DROP TABLE public.asset;
DROP SEQUENCE public.administrator_id_seq;
DROP TABLE public.administrator;
DROP SEQUENCE public.address_id_seq;
DROP TABLE public.address;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 233 (class 1259 OID 17936)
-- Name: address; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.address (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "fullName" character varying DEFAULT ''::character varying NOT NULL,
    company character varying DEFAULT ''::character varying NOT NULL,
    "streetLine1" character varying NOT NULL,
    "streetLine2" character varying DEFAULT ''::character varying NOT NULL,
    city character varying DEFAULT ''::character varying NOT NULL,
    province character varying DEFAULT ''::character varying NOT NULL,
    "postalCode" character varying DEFAULT ''::character varying NOT NULL,
    "phoneNumber" character varying DEFAULT ''::character varying NOT NULL,
    "defaultShippingAddress" boolean DEFAULT false NOT NULL,
    "defaultBillingAddress" boolean DEFAULT false NOT NULL,
    id integer NOT NULL,
    "customerId" integer,
    "countryId" integer
);


--
-- TOC entry 234 (class 1259 OID 17952)
-- Name: address_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.address_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4467 (class 0 OID 0)
-- Dependencies: 234
-- Name: address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.address_id_seq OWNED BY public.address.id;


--
-- TOC entry 235 (class 1259 OID 17953)
-- Name: administrator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administrator (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    "emailAddress" character varying NOT NULL,
    id integer NOT NULL,
    "userId" integer
);


--
-- TOC entry 236 (class 1259 OID 17960)
-- Name: administrator_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.administrator_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4468 (class 0 OID 0)
-- Dependencies: 236
-- Name: administrator_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.administrator_id_seq OWNED BY public.administrator.id;


--
-- TOC entry 237 (class 1259 OID 17961)
-- Name: asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    type character varying NOT NULL,
    "mimeType" character varying NOT NULL,
    width integer DEFAULT 0 NOT NULL,
    height integer DEFAULT 0 NOT NULL,
    "fileSize" integer NOT NULL,
    source character varying NOT NULL,
    preview character varying NOT NULL,
    "focalPoint" text,
    id integer NOT NULL,
    "customFieldsPreviewimagehash" character varying(255)
);


--
-- TOC entry 238 (class 1259 OID 17970)
-- Name: asset_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_channels_channel (
    "assetId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 239 (class 1259 OID 17973)
-- Name: asset_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4469 (class 0 OID 0)
-- Dependencies: 239
-- Name: asset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asset_id_seq OWNED BY public.asset.id;


--
-- TOC entry 240 (class 1259 OID 17974)
-- Name: asset_tags_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_tags_tag (
    "assetId" integer NOT NULL,
    "tagId" integer NOT NULL
);


--
-- TOC entry 241 (class 1259 OID 17977)
-- Name: authentication_method; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authentication_method (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    identifier character varying,
    "passwordHash" character varying,
    "verificationToken" character varying,
    "passwordResetToken" character varying,
    "identifierChangeToken" character varying,
    "pendingIdentifier" character varying,
    strategy character varying,
    "externalIdentifier" character varying,
    metadata text,
    id integer NOT NULL,
    type character varying NOT NULL,
    "userId" integer
);


--
-- TOC entry 242 (class 1259 OID 17984)
-- Name: authentication_method_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.authentication_method_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4470 (class 0 OID 0)
-- Dependencies: 242
-- Name: authentication_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.authentication_method_id_seq OWNED BY public.authentication_method.id;


--
-- TOC entry 243 (class 1259 OID 17985)
-- Name: channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    code character varying NOT NULL,
    token character varying NOT NULL,
    description character varying DEFAULT ''::character varying,
    "defaultLanguageCode" character varying NOT NULL,
    "availableLanguageCodes" text,
    "defaultCurrencyCode" character varying NOT NULL,
    "availableCurrencyCodes" text,
    "trackInventory" boolean DEFAULT true NOT NULL,
    "outOfStockThreshold" integer DEFAULT 0 NOT NULL,
    "pricesIncludeTax" boolean NOT NULL,
    id integer NOT NULL,
    "sellerId" integer,
    "defaultTaxZoneId" integer,
    "defaultShippingZoneId" integer
);


--
-- TOC entry 244 (class 1259 OID 17995)
-- Name: channel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4471 (class 0 OID 0)
-- Dependencies: 244
-- Name: channel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_id_seq OWNED BY public.channel.id;


--
-- TOC entry 245 (class 1259 OID 17996)
-- Name: collection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "isRoot" boolean DEFAULT false NOT NULL,
    "position" integer NOT NULL,
    "isPrivate" boolean DEFAULT false NOT NULL,
    filters text NOT NULL,
    "inheritFilters" boolean DEFAULT true NOT NULL,
    id integer NOT NULL,
    "parentId" integer,
    "featuredAssetId" integer
);


--
-- TOC entry 246 (class 1259 OID 18006)
-- Name: collection_asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_asset (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "assetId" integer NOT NULL,
    "position" integer NOT NULL,
    "collectionId" integer NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 247 (class 1259 OID 18011)
-- Name: collection_asset_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collection_asset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4472 (class 0 OID 0)
-- Dependencies: 247
-- Name: collection_asset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collection_asset_id_seq OWNED BY public.collection_asset.id;


--
-- TOC entry 248 (class 1259 OID 18012)
-- Name: collection_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_channels_channel (
    "collectionId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 249 (class 1259 OID 18015)
-- Name: collection_closure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_closure (
    id_ancestor integer NOT NULL,
    id_descendant integer NOT NULL
);


--
-- TOC entry 250 (class 1259 OID 18018)
-- Name: collection_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4473 (class 0 OID 0)
-- Dependencies: 250
-- Name: collection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collection_id_seq OWNED BY public.collection.id;


--
-- TOC entry 251 (class 1259 OID 18019)
-- Name: collection_product_variants_product_variant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_product_variants_product_variant (
    "collectionId" integer NOT NULL,
    "productVariantId" integer NOT NULL
);


--
-- TOC entry 252 (class 1259 OID 18022)
-- Name: collection_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    description text NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 253 (class 1259 OID 18029)
-- Name: collection_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collection_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4474 (class 0 OID 0)
-- Dependencies: 253
-- Name: collection_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collection_translation_id_seq OWNED BY public.collection_translation.id;


--
-- TOC entry 254 (class 1259 OID 18030)
-- Name: customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    title character varying,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    "phoneNumber" character varying,
    "emailAddress" character varying NOT NULL,
    id integer NOT NULL,
    "userId" integer
);


--
-- TOC entry 255 (class 1259 OID 18037)
-- Name: customer_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_channels_channel (
    "customerId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 256 (class 1259 OID 18040)
-- Name: customer_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_group (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 257 (class 1259 OID 18047)
-- Name: customer_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_group_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4475 (class 0 OID 0)
-- Dependencies: 257
-- Name: customer_group_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_group_id_seq OWNED BY public.customer_group.id;


--
-- TOC entry 258 (class 1259 OID 18048)
-- Name: customer_groups_customer_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_groups_customer_group (
    "customerId" integer NOT NULL,
    "customerGroupId" integer NOT NULL
);


--
-- TOC entry 259 (class 1259 OID 18051)
-- Name: customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4476 (class 0 OID 0)
-- Dependencies: 259
-- Name: customer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_id_seq OWNED BY public.customer.id;


--
-- TOC entry 260 (class 1259 OID 18052)
-- Name: facet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facet (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "isPrivate" boolean DEFAULT false NOT NULL,
    code character varying NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 261 (class 1259 OID 18060)
-- Name: facet_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facet_channels_channel (
    "facetId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 262 (class 1259 OID 18063)
-- Name: facet_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facet_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4477 (class 0 OID 0)
-- Dependencies: 262
-- Name: facet_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facet_id_seq OWNED BY public.facet.id;


--
-- TOC entry 263 (class 1259 OID 18064)
-- Name: facet_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facet_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 264 (class 1259 OID 18071)
-- Name: facet_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facet_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4478 (class 0 OID 0)
-- Dependencies: 264
-- Name: facet_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facet_translation_id_seq OWNED BY public.facet_translation.id;


--
-- TOC entry 265 (class 1259 OID 18072)
-- Name: facet_value; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facet_value (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    code character varying NOT NULL,
    id integer NOT NULL,
    "facetId" integer NOT NULL
);


--
-- TOC entry 266 (class 1259 OID 18079)
-- Name: facet_value_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facet_value_channels_channel (
    "facetValueId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 267 (class 1259 OID 18082)
-- Name: facet_value_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facet_value_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4479 (class 0 OID 0)
-- Dependencies: 267
-- Name: facet_value_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facet_value_id_seq OWNED BY public.facet_value.id;


--
-- TOC entry 268 (class 1259 OID 18083)
-- Name: facet_value_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facet_value_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 269 (class 1259 OID 18090)
-- Name: facet_value_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facet_value_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4480 (class 0 OID 0)
-- Dependencies: 269
-- Name: facet_value_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facet_value_translation_id_seq OWNED BY public.facet_value_translation.id;


--
-- TOC entry 270 (class 1259 OID 18091)
-- Name: fulfillment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fulfillment (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    state character varying NOT NULL,
    "trackingCode" character varying DEFAULT ''::character varying NOT NULL,
    method character varying NOT NULL,
    "handlerCode" character varying NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 271 (class 1259 OID 18099)
-- Name: fulfillment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fulfillment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4481 (class 0 OID 0)
-- Dependencies: 271
-- Name: fulfillment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fulfillment_id_seq OWNED BY public.fulfillment.id;


--
-- TOC entry 272 (class 1259 OID 18100)
-- Name: global_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_settings (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "availableLanguages" text NOT NULL,
    "trackInventory" boolean DEFAULT true NOT NULL,
    "outOfStockThreshold" integer DEFAULT 0 NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 273 (class 1259 OID 18109)
-- Name: global_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4482 (class 0 OID 0)
-- Dependencies: 273
-- Name: global_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_settings_id_seq OWNED BY public.global_settings.id;


--
-- TOC entry 274 (class 1259 OID 18110)
-- Name: history_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.history_entry (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    type character varying NOT NULL,
    "isPublic" boolean NOT NULL,
    data text NOT NULL,
    id integer NOT NULL,
    discriminator character varying NOT NULL,
    "administratorId" integer,
    "customerId" integer,
    "orderId" integer
);


--
-- TOC entry 275 (class 1259 OID 18117)
-- Name: history_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.history_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4483 (class 0 OID 0)
-- Dependencies: 275
-- Name: history_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.history_entry_id_seq OWNED BY public.history_entry.id;


--
-- TOC entry 276 (class 1259 OID 18118)
-- Name: job_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_record (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "queueName" character varying NOT NULL,
    data text,
    state character varying NOT NULL,
    progress integer NOT NULL,
    result text,
    error character varying,
    "startedAt" timestamp(6) without time zone,
    "settledAt" timestamp(6) without time zone,
    "isSettled" boolean NOT NULL,
    retries integer NOT NULL,
    attempts integer NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 277 (class 1259 OID 18125)
-- Name: job_record_buffer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_record_buffer (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "bufferId" character varying NOT NULL,
    job text NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 278 (class 1259 OID 18132)
-- Name: job_record_buffer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_record_buffer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4484 (class 0 OID 0)
-- Dependencies: 278
-- Name: job_record_buffer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_record_buffer_id_seq OWNED BY public.job_record_buffer.id;


--
-- TOC entry 279 (class 1259 OID 18133)
-- Name: job_record_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4485 (class 0 OID 0)
-- Dependencies: 279
-- Name: job_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_record_id_seq OWNED BY public.job_record.id;


--
-- TOC entry 280 (class 1259 OID 18134)
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


--
-- TOC entry 281 (class 1259 OID 18139)
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4486 (class 0 OID 0)
-- Dependencies: 281
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- TOC entry 282 (class 1259 OID 18140)
-- Name: order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."order" (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    type character varying DEFAULT 'Regular'::character varying NOT NULL,
    code character varying NOT NULL,
    state character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "orderPlacedAt" timestamp without time zone,
    "couponCodes" text NOT NULL,
    "shippingAddress" text NOT NULL,
    "billingAddress" text NOT NULL,
    "currencyCode" character varying NOT NULL,
    id integer NOT NULL,
    "aggregateOrderId" integer,
    "customerId" integer,
    "taxZoneId" integer,
    "subTotal" integer NOT NULL,
    "subTotalWithTax" integer NOT NULL,
    shipping integer DEFAULT 0 NOT NULL,
    "shippingWithTax" integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 283 (class 1259 OID 18151)
-- Name: order_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_channels_channel (
    "orderId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 284 (class 1259 OID 18154)
-- Name: order_fulfillments_fulfillment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_fulfillments_fulfillment (
    "orderId" integer NOT NULL,
    "fulfillmentId" integer NOT NULL
);


--
-- TOC entry 285 (class 1259 OID 18157)
-- Name: order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4487 (class 0 OID 0)
-- Dependencies: 285
-- Name: order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_id_seq OWNED BY public."order".id;


--
-- TOC entry 286 (class 1259 OID 18158)
-- Name: order_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_line (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    quantity integer NOT NULL,
    "orderPlacedQuantity" integer DEFAULT 0 NOT NULL,
    "listPriceIncludesTax" boolean NOT NULL,
    adjustments text NOT NULL,
    "taxLines" text NOT NULL,
    id integer NOT NULL,
    "sellerChannelId" integer,
    "shippingLineId" integer,
    "productVariantId" integer NOT NULL,
    "taxCategoryId" integer,
    "initialListPrice" integer,
    "listPrice" integer NOT NULL,
    "featuredAssetId" integer,
    "orderId" integer
);


--
-- TOC entry 287 (class 1259 OID 18166)
-- Name: order_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4488 (class 0 OID 0)
-- Dependencies: 287
-- Name: order_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_line_id_seq OWNED BY public.order_line.id;


--
-- TOC entry 288 (class 1259 OID 18167)
-- Name: order_line_reference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_line_reference (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    quantity integer NOT NULL,
    id integer NOT NULL,
    "fulfillmentId" integer,
    "modificationId" integer,
    "orderLineId" integer NOT NULL,
    "refundId" integer,
    discriminator character varying NOT NULL
);


--
-- TOC entry 289 (class 1259 OID 18174)
-- Name: order_line_reference_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_line_reference_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4489 (class 0 OID 0)
-- Dependencies: 289
-- Name: order_line_reference_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_line_reference_id_seq OWNED BY public.order_line_reference.id;


--
-- TOC entry 290 (class 1259 OID 18175)
-- Name: order_modification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_modification (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    note character varying NOT NULL,
    "shippingAddressChange" text,
    "billingAddressChange" text,
    id integer NOT NULL,
    "priceChange" integer NOT NULL,
    "orderId" integer,
    "paymentId" integer,
    "refundId" integer
);


--
-- TOC entry 291 (class 1259 OID 18182)
-- Name: order_modification_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_modification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4490 (class 0 OID 0)
-- Dependencies: 291
-- Name: order_modification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_modification_id_seq OWNED BY public.order_modification.id;


--
-- TOC entry 292 (class 1259 OID 18183)
-- Name: order_promotions_promotion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_promotions_promotion (
    "orderId" integer NOT NULL,
    "promotionId" integer NOT NULL
);


--
-- TOC entry 293 (class 1259 OID 18186)
-- Name: payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    method character varying NOT NULL,
    state character varying NOT NULL,
    "errorMessage" character varying,
    "transactionId" character varying,
    metadata text NOT NULL,
    id integer NOT NULL,
    amount integer NOT NULL,
    "orderId" integer
);


--
-- TOC entry 294 (class 1259 OID 18193)
-- Name: payment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4491 (class 0 OID 0)
-- Dependencies: 294
-- Name: payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_id_seq OWNED BY public.payment.id;


--
-- TOC entry 295 (class 1259 OID 18194)
-- Name: payment_method; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_method (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    code character varying DEFAULT ''::character varying NOT NULL,
    enabled boolean NOT NULL,
    checker text,
    handler text NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 296 (class 1259 OID 18202)
-- Name: payment_method_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_method_channels_channel (
    "paymentMethodId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 297 (class 1259 OID 18205)
-- Name: payment_method_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_method_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4492 (class 0 OID 0)
-- Dependencies: 297
-- Name: payment_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_method_id_seq OWNED BY public.payment_method.id;


--
-- TOC entry 298 (class 1259 OID 18206)
-- Name: payment_method_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_method_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    description text NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 299 (class 1259 OID 18213)
-- Name: payment_method_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_method_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4493 (class 0 OID 0)
-- Dependencies: 299
-- Name: payment_method_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_method_translation_id_seq OWNED BY public.payment_method_translation.id;


--
-- TOC entry 300 (class 1259 OID 18214)
-- Name: product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    enabled boolean DEFAULT true NOT NULL,
    id integer NOT NULL,
    "featuredAssetId" integer
);


--
-- TOC entry 301 (class 1259 OID 18220)
-- Name: product_asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_asset (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "assetId" integer NOT NULL,
    "position" integer NOT NULL,
    "productId" integer NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 302 (class 1259 OID 18225)
-- Name: product_asset_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_asset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4494 (class 0 OID 0)
-- Dependencies: 302
-- Name: product_asset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_asset_id_seq OWNED BY public.product_asset.id;


--
-- TOC entry 303 (class 1259 OID 18226)
-- Name: product_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_channels_channel (
    "productId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 304 (class 1259 OID 18229)
-- Name: product_facet_values_facet_value; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_facet_values_facet_value (
    "productId" integer NOT NULL,
    "facetValueId" integer NOT NULL
);


--
-- TOC entry 305 (class 1259 OID 18232)
-- Name: product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4495 (class 0 OID 0)
-- Dependencies: 305
-- Name: product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_id_seq OWNED BY public.product.id;


--
-- TOC entry 306 (class 1259 OID 18233)
-- Name: product_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_option (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    code character varying NOT NULL,
    id integer NOT NULL,
    "groupId" integer NOT NULL
);


--
-- TOC entry 307 (class 1259 OID 18240)
-- Name: product_option_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_option_group (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    code character varying NOT NULL,
    id integer NOT NULL,
    "productId" integer
);


--
-- TOC entry 308 (class 1259 OID 18247)
-- Name: product_option_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_option_group_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4496 (class 0 OID 0)
-- Dependencies: 308
-- Name: product_option_group_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_option_group_id_seq OWNED BY public.product_option_group.id;


--
-- TOC entry 309 (class 1259 OID 18248)
-- Name: product_option_group_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_option_group_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 310 (class 1259 OID 18255)
-- Name: product_option_group_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_option_group_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4497 (class 0 OID 0)
-- Dependencies: 310
-- Name: product_option_group_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_option_group_translation_id_seq OWNED BY public.product_option_group_translation.id;


--
-- TOC entry 311 (class 1259 OID 18256)
-- Name: product_option_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_option_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4498 (class 0 OID 0)
-- Dependencies: 311
-- Name: product_option_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_option_id_seq OWNED BY public.product_option.id;


--
-- TOC entry 312 (class 1259 OID 18257)
-- Name: product_option_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_option_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 313 (class 1259 OID 18264)
-- Name: product_option_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_option_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4499 (class 0 OID 0)
-- Dependencies: 313
-- Name: product_option_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_option_translation_id_seq OWNED BY public.product_option_translation.id;


--
-- TOC entry 314 (class 1259 OID 18265)
-- Name: product_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    slug character varying NOT NULL,
    description text NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 315 (class 1259 OID 18272)
-- Name: product_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4500 (class 0 OID 0)
-- Dependencies: 315
-- Name: product_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_translation_id_seq OWNED BY public.product_translation.id;


--
-- TOC entry 316 (class 1259 OID 18273)
-- Name: product_variant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    enabled boolean DEFAULT true NOT NULL,
    sku character varying NOT NULL,
    "outOfStockThreshold" integer DEFAULT 0 NOT NULL,
    "useGlobalOutOfStockThreshold" boolean DEFAULT true NOT NULL,
    "trackInventory" character varying DEFAULT 'INHERIT'::character varying NOT NULL,
    id integer NOT NULL,
    "featuredAssetId" integer,
    "taxCategoryId" integer,
    "productId" integer
);


--
-- TOC entry 317 (class 1259 OID 18284)
-- Name: product_variant_asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_asset (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "assetId" integer NOT NULL,
    "position" integer NOT NULL,
    "productVariantId" integer NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 318 (class 1259 OID 18289)
-- Name: product_variant_asset_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_variant_asset_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4501 (class 0 OID 0)
-- Dependencies: 318
-- Name: product_variant_asset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_variant_asset_id_seq OWNED BY public.product_variant_asset.id;


--
-- TOC entry 319 (class 1259 OID 18290)
-- Name: product_variant_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_channels_channel (
    "productVariantId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 320 (class 1259 OID 18293)
-- Name: product_variant_facet_values_facet_value; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_facet_values_facet_value (
    "productVariantId" integer NOT NULL,
    "facetValueId" integer NOT NULL
);


--
-- TOC entry 321 (class 1259 OID 18296)
-- Name: product_variant_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_variant_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4502 (class 0 OID 0)
-- Dependencies: 321
-- Name: product_variant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_variant_id_seq OWNED BY public.product_variant.id;


--
-- TOC entry 322 (class 1259 OID 18297)
-- Name: product_variant_options_product_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_options_product_option (
    "productVariantId" integer NOT NULL,
    "productOptionId" integer NOT NULL
);


--
-- TOC entry 323 (class 1259 OID 18300)
-- Name: product_variant_price; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_price (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "currencyCode" character varying NOT NULL,
    id integer NOT NULL,
    "channelId" integer,
    price integer NOT NULL,
    "variantId" integer
);


--
-- TOC entry 324 (class 1259 OID 18307)
-- Name: product_variant_price_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_variant_price_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4503 (class 0 OID 0)
-- Dependencies: 324
-- Name: product_variant_price_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_variant_price_id_seq OWNED BY public.product_variant_price.id;


--
-- TOC entry 325 (class 1259 OID 18308)
-- Name: product_variant_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 326 (class 1259 OID 18315)
-- Name: product_variant_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_variant_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4504 (class 0 OID 0)
-- Dependencies: 326
-- Name: product_variant_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_variant_translation_id_seq OWNED BY public.product_variant_translation.id;


--
-- TOC entry 327 (class 1259 OID 18316)
-- Name: promotion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    "startsAt" timestamp without time zone,
    "endsAt" timestamp without time zone,
    "couponCode" character varying,
    "perCustomerUsageLimit" integer,
    "usageLimit" integer,
    enabled boolean NOT NULL,
    conditions text NOT NULL,
    actions text NOT NULL,
    "priorityScore" integer NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 328 (class 1259 OID 18323)
-- Name: promotion_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_channels_channel (
    "promotionId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 329 (class 1259 OID 18326)
-- Name: promotion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4505 (class 0 OID 0)
-- Dependencies: 329
-- Name: promotion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotion_id_seq OWNED BY public.promotion.id;


--
-- TOC entry 330 (class 1259 OID 18327)
-- Name: promotion_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotion_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    description text NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 331 (class 1259 OID 18334)
-- Name: promotion_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.promotion_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4506 (class 0 OID 0)
-- Dependencies: 331
-- Name: promotion_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.promotion_translation_id_seq OWNED BY public.promotion_translation.id;


--
-- TOC entry 332 (class 1259 OID 18335)
-- Name: refund; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    method character varying NOT NULL,
    reason character varying,
    state character varying NOT NULL,
    "transactionId" character varying,
    metadata text NOT NULL,
    id integer NOT NULL,
    "paymentId" integer NOT NULL,
    items integer NOT NULL,
    shipping integer NOT NULL,
    adjustment integer NOT NULL,
    total integer NOT NULL
);


--
-- TOC entry 333 (class 1259 OID 18342)
-- Name: refund_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refund_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4507 (class 0 OID 0)
-- Dependencies: 333
-- Name: refund_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refund_id_seq OWNED BY public.refund.id;


--
-- TOC entry 334 (class 1259 OID 18343)
-- Name: region; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.region (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    code character varying NOT NULL,
    type character varying NOT NULL,
    enabled boolean NOT NULL,
    id integer NOT NULL,
    "parentId" integer,
    discriminator character varying NOT NULL
);


--
-- TOC entry 335 (class 1259 OID 18350)
-- Name: region_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.region_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4508 (class 0 OID 0)
-- Dependencies: 335
-- Name: region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.region_id_seq OWNED BY public.region.id;


--
-- TOC entry 336 (class 1259 OID 18351)
-- Name: region_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.region_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 337 (class 1259 OID 18358)
-- Name: region_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.region_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4509 (class 0 OID 0)
-- Dependencies: 337
-- Name: region_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.region_translation_id_seq OWNED BY public.region_translation.id;


--
-- TOC entry 338 (class 1259 OID 18359)
-- Name: role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    code character varying NOT NULL,
    description character varying NOT NULL,
    permissions text NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 339 (class 1259 OID 18366)
-- Name: role_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_channels_channel (
    "roleId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 340 (class 1259 OID 18369)
-- Name: role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4510 (class 0 OID 0)
-- Dependencies: 340
-- Name: role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_id_seq OWNED BY public.role.id;


--
-- TOC entry 341 (class 1259 OID 18370)
-- Name: scheduled_task_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_task_record (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "taskId" character varying NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "lockedAt" timestamp(3) without time zone,
    "lastExecutedAt" timestamp(3) without time zone,
    "manuallyTriggeredAt" timestamp(3) without time zone,
    "lastResult" json,
    id integer NOT NULL
);


--
-- TOC entry 342 (class 1259 OID 18378)
-- Name: scheduled_task_record_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scheduled_task_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4511 (class 0 OID 0)
-- Dependencies: 342
-- Name: scheduled_task_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scheduled_task_record_id_seq OWNED BY public.scheduled_task_record.id;


--
-- TOC entry 343 (class 1259 OID 18379)
-- Name: search_index_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.search_index_item (
    "languageCode" character varying NOT NULL,
    enabled boolean NOT NULL,
    "productName" character varying NOT NULL,
    "productVariantName" character varying NOT NULL,
    description text NOT NULL,
    slug character varying NOT NULL,
    sku character varying NOT NULL,
    "facetIds" text NOT NULL,
    "facetValueIds" text NOT NULL,
    "collectionIds" text NOT NULL,
    "collectionSlugs" text NOT NULL,
    "channelIds" text NOT NULL,
    "productPreview" character varying NOT NULL,
    "productPreviewFocalPoint" text,
    "productVariantPreview" character varying NOT NULL,
    "productVariantPreviewFocalPoint" text,
    "productVariantId" integer NOT NULL,
    "channelId" integer NOT NULL,
    "productId" integer NOT NULL,
    "productAssetId" integer,
    "productVariantAssetId" integer,
    price integer NOT NULL,
    "priceWithTax" integer NOT NULL,
    "inStock" boolean DEFAULT true NOT NULL,
    "productInStock" boolean DEFAULT true NOT NULL
);


--
-- TOC entry 344 (class 1259 OID 18386)
-- Name: seller; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    name character varying NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 345 (class 1259 OID 18393)
-- Name: seller_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.seller_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4512 (class 0 OID 0)
-- Dependencies: 345
-- Name: seller_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.seller_id_seq OWNED BY public.seller.id;


--
-- TOC entry 346 (class 1259 OID 18394)
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    token character varying NOT NULL,
    expires timestamp without time zone NOT NULL,
    invalidated boolean NOT NULL,
    "authenticationStrategy" character varying,
    id integer NOT NULL,
    "activeOrderId" integer,
    "activeChannelId" integer,
    type character varying NOT NULL,
    "userId" integer
);


--
-- TOC entry 347 (class 1259 OID 18401)
-- Name: session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4513 (class 0 OID 0)
-- Dependencies: 347
-- Name: session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.session_id_seq OWNED BY public.session.id;


--
-- TOC entry 348 (class 1259 OID 18402)
-- Name: shipping_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_line (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "listPriceIncludesTax" boolean NOT NULL,
    adjustments text NOT NULL,
    "taxLines" text NOT NULL,
    id integer NOT NULL,
    "shippingMethodId" integer NOT NULL,
    "listPrice" integer NOT NULL,
    "orderId" integer
);


--
-- TOC entry 349 (class 1259 OID 18409)
-- Name: shipping_line_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipping_line_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4514 (class 0 OID 0)
-- Dependencies: 349
-- Name: shipping_line_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipping_line_id_seq OWNED BY public.shipping_line.id;


--
-- TOC entry 350 (class 1259 OID 18410)
-- Name: shipping_method; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_method (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    code character varying NOT NULL,
    checker text NOT NULL,
    calculator text NOT NULL,
    "fulfillmentHandlerCode" character varying NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 351 (class 1259 OID 18417)
-- Name: shipping_method_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_method_channels_channel (
    "shippingMethodId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 352 (class 1259 OID 18420)
-- Name: shipping_method_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipping_method_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4515 (class 0 OID 0)
-- Dependencies: 352
-- Name: shipping_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipping_method_id_seq OWNED BY public.shipping_method.id;


--
-- TOC entry 353 (class 1259 OID 18421)
-- Name: shipping_method_translation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_method_translation (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "languageCode" character varying NOT NULL,
    name character varying DEFAULT ''::character varying NOT NULL,
    description character varying DEFAULT ''::character varying NOT NULL,
    id integer NOT NULL,
    "baseId" integer
);


--
-- TOC entry 354 (class 1259 OID 18430)
-- Name: shipping_method_translation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipping_method_translation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4516 (class 0 OID 0)
-- Dependencies: 354
-- Name: shipping_method_translation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipping_method_translation_id_seq OWNED BY public.shipping_method_translation.id;


--
-- TOC entry 355 (class 1259 OID 18431)
-- Name: stock_level; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_level (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "stockOnHand" integer NOT NULL,
    "stockAllocated" integer NOT NULL,
    id integer NOT NULL,
    "productVariantId" integer NOT NULL,
    "stockLocationId" integer NOT NULL
);


--
-- TOC entry 356 (class 1259 OID 18436)
-- Name: stock_level_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_level_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4517 (class 0 OID 0)
-- Dependencies: 356
-- Name: stock_level_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_level_id_seq OWNED BY public.stock_level.id;


--
-- TOC entry 357 (class 1259 OID 18437)
-- Name: stock_location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_location (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    description character varying NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 358 (class 1259 OID 18444)
-- Name: stock_location_channels_channel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_location_channels_channel (
    "stockLocationId" integer NOT NULL,
    "channelId" integer NOT NULL
);


--
-- TOC entry 359 (class 1259 OID 18447)
-- Name: stock_location_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4518 (class 0 OID 0)
-- Dependencies: 359
-- Name: stock_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_location_id_seq OWNED BY public.stock_location.id;


--
-- TOC entry 360 (class 1259 OID 18448)
-- Name: stock_movement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movement (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    type character varying NOT NULL,
    quantity integer NOT NULL,
    id integer NOT NULL,
    "stockLocationId" integer NOT NULL,
    discriminator character varying NOT NULL,
    "productVariantId" integer,
    "orderLineId" integer
);


--
-- TOC entry 361 (class 1259 OID 18455)
-- Name: stock_movement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_movement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4519 (class 0 OID 0)
-- Dependencies: 361
-- Name: stock_movement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_movement_id_seq OWNED BY public.stock_movement.id;


--
-- TOC entry 362 (class 1259 OID 18456)
-- Name: surcharge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.surcharge (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    description character varying NOT NULL,
    "listPriceIncludesTax" boolean NOT NULL,
    sku character varying NOT NULL,
    "taxLines" text NOT NULL,
    id integer NOT NULL,
    "listPrice" integer NOT NULL,
    "orderId" integer,
    "orderModificationId" integer
);


--
-- TOC entry 363 (class 1259 OID 18463)
-- Name: surcharge_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.surcharge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4520 (class 0 OID 0)
-- Dependencies: 363
-- Name: surcharge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.surcharge_id_seq OWNED BY public.surcharge.id;


--
-- TOC entry 364 (class 1259 OID 18464)
-- Name: tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tag (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    value character varying NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 365 (class 1259 OID 18471)
-- Name: tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4521 (class 0 OID 0)
-- Dependencies: 365
-- Name: tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tag_id_seq OWNED BY public.tag.id;


--
-- TOC entry 366 (class 1259 OID 18472)
-- Name: tax_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_category (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 367 (class 1259 OID 18480)
-- Name: tax_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4522 (class 0 OID 0)
-- Dependencies: 367
-- Name: tax_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_category_id_seq OWNED BY public.tax_category.id;


--
-- TOC entry 368 (class 1259 OID 18481)
-- Name: tax_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_rate (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    enabled boolean NOT NULL,
    value numeric(5,2) NOT NULL,
    id integer NOT NULL,
    "categoryId" integer,
    "zoneId" integer,
    "customerGroupId" integer
);


--
-- TOC entry 369 (class 1259 OID 18488)
-- Name: tax_rate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_rate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4523 (class 0 OID 0)
-- Dependencies: 369
-- Name: tax_rate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_rate_id_seq OWNED BY public.tax_rate.id;


--
-- TOC entry 370 (class 1259 OID 18489)
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone,
    identifier character varying NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    "lastLogin" timestamp without time zone,
    id integer NOT NULL
);


--
-- TOC entry 371 (class 1259 OID 18497)
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4524 (class 0 OID 0)
-- Dependencies: 371
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- TOC entry 372 (class 1259 OID 18498)
-- Name: user_roles_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles_role (
    "userId" integer NOT NULL,
    "roleId" integer NOT NULL
);


--
-- TOC entry 373 (class 1259 OID 18501)
-- Name: zone; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zone (
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    id integer NOT NULL
);


--
-- TOC entry 374 (class 1259 OID 18508)
-- Name: zone_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zone_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4525 (class 0 OID 0)
-- Dependencies: 374
-- Name: zone_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zone_id_seq OWNED BY public.zone.id;


--
-- TOC entry 375 (class 1259 OID 18509)
-- Name: zone_members_region; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zone_members_region (
    "zoneId" integer NOT NULL,
    "regionId" integer NOT NULL
);


--
-- TOC entry 3668 (class 2604 OID 18512)
-- Name: address id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address ALTER COLUMN id SET DEFAULT nextval('public.address_id_seq'::regclass);


--
-- TOC entry 3671 (class 2604 OID 18513)
-- Name: administrator id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrator ALTER COLUMN id SET DEFAULT nextval('public.administrator_id_seq'::regclass);


--
-- TOC entry 3676 (class 2604 OID 18514)
-- Name: asset id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset ALTER COLUMN id SET DEFAULT nextval('public.asset_id_seq'::regclass);


--
-- TOC entry 3679 (class 2604 OID 18515)
-- Name: authentication_method id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_method ALTER COLUMN id SET DEFAULT nextval('public.authentication_method_id_seq'::regclass);


--
-- TOC entry 3685 (class 2604 OID 18516)
-- Name: channel id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel ALTER COLUMN id SET DEFAULT nextval('public.channel_id_seq'::regclass);


--
-- TOC entry 3691 (class 2604 OID 18517)
-- Name: collection id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection ALTER COLUMN id SET DEFAULT nextval('public.collection_id_seq'::regclass);


--
-- TOC entry 3694 (class 2604 OID 18518)
-- Name: collection_asset id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_asset ALTER COLUMN id SET DEFAULT nextval('public.collection_asset_id_seq'::regclass);


--
-- TOC entry 3697 (class 2604 OID 18519)
-- Name: collection_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_translation ALTER COLUMN id SET DEFAULT nextval('public.collection_translation_id_seq'::regclass);


--
-- TOC entry 3700 (class 2604 OID 18520)
-- Name: customer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer ALTER COLUMN id SET DEFAULT nextval('public.customer_id_seq'::regclass);


--
-- TOC entry 3703 (class 2604 OID 18521)
-- Name: customer_group id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_group ALTER COLUMN id SET DEFAULT nextval('public.customer_group_id_seq'::regclass);


--
-- TOC entry 3707 (class 2604 OID 18522)
-- Name: facet id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet ALTER COLUMN id SET DEFAULT nextval('public.facet_id_seq'::regclass);


--
-- TOC entry 3710 (class 2604 OID 18523)
-- Name: facet_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_translation ALTER COLUMN id SET DEFAULT nextval('public.facet_translation_id_seq'::regclass);


--
-- TOC entry 3713 (class 2604 OID 18524)
-- Name: facet_value id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_value ALTER COLUMN id SET DEFAULT nextval('public.facet_value_id_seq'::regclass);


--
-- TOC entry 3716 (class 2604 OID 18525)
-- Name: facet_value_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_value_translation ALTER COLUMN id SET DEFAULT nextval('public.facet_value_translation_id_seq'::regclass);


--
-- TOC entry 3720 (class 2604 OID 18526)
-- Name: fulfillment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulfillment ALTER COLUMN id SET DEFAULT nextval('public.fulfillment_id_seq'::regclass);


--
-- TOC entry 3725 (class 2604 OID 18527)
-- Name: global_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_settings ALTER COLUMN id SET DEFAULT nextval('public.global_settings_id_seq'::regclass);


--
-- TOC entry 3728 (class 2604 OID 18528)
-- Name: history_entry id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_entry ALTER COLUMN id SET DEFAULT nextval('public.history_entry_id_seq'::regclass);


--
-- TOC entry 3731 (class 2604 OID 18529)
-- Name: job_record id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_record ALTER COLUMN id SET DEFAULT nextval('public.job_record_id_seq'::regclass);


--
-- TOC entry 3734 (class 2604 OID 18530)
-- Name: job_record_buffer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_record_buffer ALTER COLUMN id SET DEFAULT nextval('public.job_record_buffer_id_seq'::regclass);


--
-- TOC entry 3735 (class 2604 OID 18531)
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- TOC entry 3740 (class 2604 OID 18532)
-- Name: order id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."order" ALTER COLUMN id SET DEFAULT nextval('public.order_id_seq'::regclass);


--
-- TOC entry 3746 (class 2604 OID 18533)
-- Name: order_line id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line ALTER COLUMN id SET DEFAULT nextval('public.order_line_id_seq'::regclass);


--
-- TOC entry 3749 (class 2604 OID 18534)
-- Name: order_line_reference id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_reference ALTER COLUMN id SET DEFAULT nextval('public.order_line_reference_id_seq'::regclass);


--
-- TOC entry 3752 (class 2604 OID 18535)
-- Name: order_modification id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_modification ALTER COLUMN id SET DEFAULT nextval('public.order_modification_id_seq'::regclass);


--
-- TOC entry 3755 (class 2604 OID 18536)
-- Name: payment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment ALTER COLUMN id SET DEFAULT nextval('public.payment_id_seq'::regclass);


--
-- TOC entry 3759 (class 2604 OID 18537)
-- Name: payment_method id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_method ALTER COLUMN id SET DEFAULT nextval('public.payment_method_id_seq'::regclass);


--
-- TOC entry 3762 (class 2604 OID 18538)
-- Name: payment_method_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_method_translation ALTER COLUMN id SET DEFAULT nextval('public.payment_method_translation_id_seq'::regclass);


--
-- TOC entry 3766 (class 2604 OID 18539)
-- Name: product id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product ALTER COLUMN id SET DEFAULT nextval('public.product_id_seq'::regclass);


--
-- TOC entry 3769 (class 2604 OID 18540)
-- Name: product_asset id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_asset ALTER COLUMN id SET DEFAULT nextval('public.product_asset_id_seq'::regclass);


--
-- TOC entry 3772 (class 2604 OID 18541)
-- Name: product_option id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option ALTER COLUMN id SET DEFAULT nextval('public.product_option_id_seq'::regclass);


--
-- TOC entry 3775 (class 2604 OID 18542)
-- Name: product_option_group id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_group ALTER COLUMN id SET DEFAULT nextval('public.product_option_group_id_seq'::regclass);


--
-- TOC entry 3778 (class 2604 OID 18543)
-- Name: product_option_group_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_group_translation ALTER COLUMN id SET DEFAULT nextval('public.product_option_group_translation_id_seq'::regclass);


--
-- TOC entry 3781 (class 2604 OID 18544)
-- Name: product_option_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_translation ALTER COLUMN id SET DEFAULT nextval('public.product_option_translation_id_seq'::regclass);


--
-- TOC entry 3784 (class 2604 OID 18545)
-- Name: product_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_translation ALTER COLUMN id SET DEFAULT nextval('public.product_translation_id_seq'::regclass);


--
-- TOC entry 3791 (class 2604 OID 18546)
-- Name: product_variant id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant ALTER COLUMN id SET DEFAULT nextval('public.product_variant_id_seq'::regclass);


--
-- TOC entry 3794 (class 2604 OID 18547)
-- Name: product_variant_asset id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_asset ALTER COLUMN id SET DEFAULT nextval('public.product_variant_asset_id_seq'::regclass);


--
-- TOC entry 3797 (class 2604 OID 18548)
-- Name: product_variant_price id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_price ALTER COLUMN id SET DEFAULT nextval('public.product_variant_price_id_seq'::regclass);


--
-- TOC entry 3800 (class 2604 OID 18549)
-- Name: product_variant_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_translation ALTER COLUMN id SET DEFAULT nextval('public.product_variant_translation_id_seq'::regclass);


--
-- TOC entry 3803 (class 2604 OID 18550)
-- Name: promotion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion ALTER COLUMN id SET DEFAULT nextval('public.promotion_id_seq'::regclass);


--
-- TOC entry 3806 (class 2604 OID 18551)
-- Name: promotion_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_translation ALTER COLUMN id SET DEFAULT nextval('public.promotion_translation_id_seq'::regclass);


--
-- TOC entry 3809 (class 2604 OID 18552)
-- Name: refund id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund ALTER COLUMN id SET DEFAULT nextval('public.refund_id_seq'::regclass);


--
-- TOC entry 3812 (class 2604 OID 18553)
-- Name: region id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.region ALTER COLUMN id SET DEFAULT nextval('public.region_id_seq'::regclass);


--
-- TOC entry 3815 (class 2604 OID 18554)
-- Name: region_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.region_translation ALTER COLUMN id SET DEFAULT nextval('public.region_translation_id_seq'::regclass);


--
-- TOC entry 3818 (class 2604 OID 18555)
-- Name: role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role ALTER COLUMN id SET DEFAULT nextval('public.role_id_seq'::regclass);


--
-- TOC entry 3822 (class 2604 OID 18556)
-- Name: scheduled_task_record id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_task_record ALTER COLUMN id SET DEFAULT nextval('public.scheduled_task_record_id_seq'::regclass);


--
-- TOC entry 3827 (class 2604 OID 18557)
-- Name: seller id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller ALTER COLUMN id SET DEFAULT nextval('public.seller_id_seq'::regclass);


--
-- TOC entry 3830 (class 2604 OID 18558)
-- Name: session id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session ALTER COLUMN id SET DEFAULT nextval('public.session_id_seq'::regclass);


--
-- TOC entry 3833 (class 2604 OID 18559)
-- Name: shipping_line id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_line ALTER COLUMN id SET DEFAULT nextval('public.shipping_line_id_seq'::regclass);


--
-- TOC entry 3836 (class 2604 OID 18560)
-- Name: shipping_method id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method ALTER COLUMN id SET DEFAULT nextval('public.shipping_method_id_seq'::regclass);


--
-- TOC entry 3841 (class 2604 OID 18561)
-- Name: shipping_method_translation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method_translation ALTER COLUMN id SET DEFAULT nextval('public.shipping_method_translation_id_seq'::regclass);


--
-- TOC entry 3844 (class 2604 OID 18562)
-- Name: stock_level id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_level ALTER COLUMN id SET DEFAULT nextval('public.stock_level_id_seq'::regclass);


--
-- TOC entry 3847 (class 2604 OID 18563)
-- Name: stock_location id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_location ALTER COLUMN id SET DEFAULT nextval('public.stock_location_id_seq'::regclass);


--
-- TOC entry 3850 (class 2604 OID 18564)
-- Name: stock_movement id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movement ALTER COLUMN id SET DEFAULT nextval('public.stock_movement_id_seq'::regclass);


--
-- TOC entry 3853 (class 2604 OID 18565)
-- Name: surcharge id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surcharge ALTER COLUMN id SET DEFAULT nextval('public.surcharge_id_seq'::regclass);


--
-- TOC entry 3856 (class 2604 OID 18566)
-- Name: tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag ALTER COLUMN id SET DEFAULT nextval('public.tag_id_seq'::regclass);


--
-- TOC entry 3860 (class 2604 OID 18567)
-- Name: tax_category id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_category ALTER COLUMN id SET DEFAULT nextval('public.tax_category_id_seq'::regclass);


--
-- TOC entry 3863 (class 2604 OID 18568)
-- Name: tax_rate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rate ALTER COLUMN id SET DEFAULT nextval('public.tax_rate_id_seq'::regclass);


--
-- TOC entry 3867 (class 2604 OID 18569)
-- Name: user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- TOC entry 3870 (class 2604 OID 18570)
-- Name: zone id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone ALTER COLUMN id SET DEFAULT nextval('public.zone_id_seq'::regclass);


--
-- TOC entry 4025 (class 2606 OID 32488)
-- Name: order_promotions_promotion PK_001dfe7435f3946fbc2d66a4e92; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_promotions_promotion
    ADD CONSTRAINT "PK_001dfe7435f3946fbc2d66a4e92" PRIMARY KEY ("orderId", "promotionId");


--
-- TOC entry 4007 (class 2606 OID 32490)
-- Name: order_line PK_01a7c973d9f30479647e44f9892; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line
    ADD CONSTRAINT "PK_01a7c973d9f30479647e44f9892" PRIMARY KEY (id);


--
-- TOC entry 4113 (class 2606 OID 32492)
-- Name: promotion_translation PK_0b4fd34d2fc7abc06189494a178; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_translation
    ADD CONSTRAINT "PK_0b4fd34d2fc7abc06189494a178" PRIMARY KEY (id);


--
-- TOC entry 3916 (class 2606 OID 32494)
-- Name: collection_channels_channel PK_0e292d80228c9b4a114d2b09476; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_channels_channel
    ADD CONSTRAINT "PK_0e292d80228c9b4a114d2b09476" PRIMARY KEY ("collectionId", "channelId");


--
-- TOC entry 3946 (class 2606 OID 32496)
-- Name: customer_groups_customer_group PK_0f902789cba691ce7ebbc9fcaa6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_groups_customer_group
    ADD CONSTRAINT "PK_0f902789cba691ce7ebbc9fcaa6" PRIMARY KEY ("customerId", "customerGroupId");


--
-- TOC entry 3987 (class 2606 OID 32498)
-- Name: order PK_1031171c13130102495201e3e20; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY (id);


--
-- TOC entry 3882 (class 2606 OID 32500)
-- Name: asset PK_1209d107fe21482beaea51b745e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT "PK_1209d107fe21482beaea51b745e" PRIMARY KEY (id);


--
-- TOC entry 4090 (class 2606 OID 32502)
-- Name: product_variant_channels_channel PK_1a10ca648c3d73c0f2b455ae191; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_channels_channel
    ADD CONSTRAINT "PK_1a10ca648c3d73c0f2b455ae191" PRIMARY KEY ("productVariantId", "channelId");


--
-- TOC entry 4077 (class 2606 OID 32504)
-- Name: product_variant PK_1ab69c9935c61f7c70791ae0a9f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT "PK_1ab69c9935c61f7c70791ae0a9f" PRIMARY KEY (id);


--
-- TOC entry 4014 (class 2606 OID 32506)
-- Name: order_line_reference PK_21891d07accb8fa87e11165bca2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_reference
    ADD CONSTRAINT "PK_21891d07accb8fa87e11165bca2" PRIMARY KEY (id);


--
-- TOC entry 4187 (class 2606 OID 32508)
-- Name: tax_rate PK_23b71b53f650c0b39e99ccef4fd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rate
    ADD CONSTRAINT "PK_23b71b53f650c0b39e99ccef4fd" PRIMARY KEY (id);


--
-- TOC entry 4182 (class 2606 OID 32510)
-- Name: tax_category PK_2432988f825c336d5584a96cded; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_category
    ADD CONSTRAINT "PK_2432988f825c336d5584a96cded" PRIMARY KEY (id);


--
-- TOC entry 3940 (class 2606 OID 32512)
-- Name: customer_channels_channel PK_27e2fa538c020889d32a0a784e8; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_channels_channel
    ADD CONSTRAINT "PK_27e2fa538c020889d32a0a784e8" PRIMARY KEY ("customerId", "channelId");


--
-- TOC entry 4139 (class 2606 OID 32514)
-- Name: seller PK_36445a9c6e794945a4a4a8d3c9d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller
    ADD CONSTRAINT "PK_36445a9c6e794945a4a4a8d3c9d" PRIMARY KEY (id);


--
-- TOC entry 3995 (class 2606 OID 32516)
-- Name: order_channels_channel PK_39853134b20afe9dfb25de18292; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_channels_channel
    ADD CONSTRAINT "PK_39853134b20afe9dfb25de18292" PRIMARY KEY ("orderId", "channelId");


--
-- TOC entry 4122 (class 2606 OID 32518)
-- Name: region_translation PK_3e0c9619cafbe579eeecfd88abc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.region_translation
    ADD CONSTRAINT "PK_3e0c9619cafbe579eeecfd88abc" PRIMARY KEY (id);


--
-- TOC entry 3999 (class 2606 OID 32520)
-- Name: order_fulfillments_fulfillment PK_414600087d71aee1583bc517590; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillments_fulfillment
    ADD CONSTRAINT "PK_414600087d71aee1583bc517590" PRIMARY KEY ("orderId", "fulfillmentId");


--
-- TOC entry 4065 (class 2606 OID 32522)
-- Name: product_option_group_translation PK_44ab19f118175288dff147c4a00; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_group_translation
    ADD CONSTRAINT "PK_44ab19f118175288dff147c4a00" PRIMARY KEY (id);


--
-- TOC entry 4110 (class 2606 OID 32524)
-- Name: promotion_channels_channel PK_4b34f9b7bf95a8d3dc7f7f6dd23; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_channels_channel
    ADD CONSTRAINT "PK_4b34f9b7bf95a8d3dc7f7f6dd23" PRIMARY KEY ("promotionId", "channelId");


--
-- TOC entry 4104 (class 2606 OID 32526)
-- Name: product_variant_translation PK_4b7f882e2b669800bed7ed065f0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_translation
    ADD CONSTRAINT "PK_4b7f882e2b669800bed7ed065f0" PRIMARY KEY (id);


--
-- TOC entry 4059 (class 2606 OID 32528)
-- Name: product_option PK_4cf3c467e9bc764bdd32c4cd938; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option
    ADD CONSTRAINT "PK_4cf3c467e9bc764bdd32c4cd938" PRIMARY KEY (id);


--
-- TOC entry 3969 (class 2606 OID 32530)
-- Name: fulfillment PK_50c102da132afffae660585981f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulfillment
    ADD CONSTRAINT "PK_50c102da132afffae660585981f" PRIMARY KEY (id);


--
-- TOC entry 3924 (class 2606 OID 32532)
-- Name: collection_product_variants_product_variant PK_50c5ed0504ded53967be811f633; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_product_variants_product_variant
    ADD CONSTRAINT "PK_50c5ed0504ded53967be811f633" PRIMARY KEY ("collectionId", "productVariantId");


--
-- TOC entry 3901 (class 2606 OID 32534)
-- Name: channel PK_590f33ee6ee7d76437acf362e39; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT "PK_590f33ee6ee7d76437acf362e39" PRIMARY KEY (id);


--
-- TOC entry 4119 (class 2606 OID 32536)
-- Name: region PK_5f48ffc3af96bc486f5f3f3a6da; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT "PK_5f48ffc3af96bc486f5f3f3a6da" PRIMARY KEY (id);


--
-- TOC entry 4072 (class 2606 OID 32538)
-- Name: product_translation PK_62d00fbc92e7a495701d6fee9d5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_translation
    ADD CONSTRAINT "PK_62d00fbc92e7a495701d6fee9d5" PRIMARY KEY (id);


--
-- TOC entry 4137 (class 2606 OID 32540)
-- Name: search_index_item PK_6470dd173311562c89e5f80b30e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_index_item
    ADD CONSTRAINT "PK_6470dd173311562c89e5f80b30e" PRIMARY KEY ("languageCode", "productVariantId", "channelId");


--
-- TOC entry 3964 (class 2606 OID 32542)
-- Name: facet_value_channels_channel PK_653fb72a256f100f52c573e419f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_value_channels_channel
    ADD CONSTRAINT "PK_653fb72a256f100f52c573e419f" PRIMARY KEY ("facetValueId", "channelId");


--
-- TOC entry 4068 (class 2606 OID 32544)
-- Name: product_option_translation PK_69c79a84baabcad3c7328576ac0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_translation
    ADD CONSTRAINT "PK_69c79a84baabcad3c7328576ac0" PRIMARY KEY (id);


--
-- TOC entry 4128 (class 2606 OID 32546)
-- Name: role_channels_channel PK_6fb9277e9f11bb8a63445c36242; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_channels_channel
    ADD CONSTRAINT "PK_6fb9277e9f11bb8a63445c36242" PRIMARY KEY ("roleId", "channelId");


--
-- TOC entry 4052 (class 2606 OID 32548)
-- Name: product_channels_channel PK_722acbcc06403e693b518d2c345; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_channels_channel
    ADD CONSTRAINT "PK_722acbcc06403e693b518d2c345" PRIMARY KEY ("productId", "channelId");


--
-- TOC entry 4030 (class 2606 OID 32550)
-- Name: payment_method PK_7744c2b2dd932c9cf42f2b9bc3a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_method
    ADD CONSTRAINT "PK_7744c2b2dd932c9cf42f2b9bc3a" PRIMARY KEY (id);


--
-- TOC entry 3978 (class 2606 OID 32552)
-- Name: job_record PK_88ce3ea0c9dca8b571450b457a7; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_record
    ADD CONSTRAINT "PK_88ce3ea0c9dca8b571450b457a7" PRIMARY KEY (id);


--
-- TOC entry 3942 (class 2606 OID 32554)
-- Name: customer_group PK_88e7da3ff7262d9e0a35aa3664e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_group
    ADD CONSTRAINT "PK_88e7da3ff7262d9e0a35aa3664e" PRIMARY KEY (id);


--
-- TOC entry 4163 (class 2606 OID 32556)
-- Name: stock_level PK_88ff7d9dfb57dc9d435e365eb69; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_level
    ADD CONSTRAINT "PK_88ff7d9dfb57dc9d435e365eb69" PRIMARY KEY (id);


--
-- TOC entry 4149 (class 2606 OID 32558)
-- Name: shipping_line PK_890522bfc44a4b6eb7cb1e52609; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_line
    ADD CONSTRAINT "PK_890522bfc44a4b6eb7cb1e52609" PRIMARY KEY (id);


--
-- TOC entry 3982 (class 2606 OID 32560)
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- TOC entry 4180 (class 2606 OID 32562)
-- Name: tag PK_8e4052373c579afc1471f526760; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tag
    ADD CONSTRAINT "PK_8e4052373c579afc1471f526760" PRIMARY KEY (id);


--
-- TOC entry 3980 (class 2606 OID 32564)
-- Name: job_record_buffer PK_9a1cfa02511065b32053efceeff; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_record_buffer
    ADD CONSTRAINT "PK_9a1cfa02511065b32053efceeff" PRIMARY KEY (id);


--
-- TOC entry 3920 (class 2606 OID 32566)
-- Name: collection_closure PK_9dda38e2273a7744b8f655782a5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_closure
    ADD CONSTRAINT "PK_9dda38e2273a7744b8f655782a5" PRIMARY KEY (id_ancestor, id_descendant);


--
-- TOC entry 4174 (class 2606 OID 32568)
-- Name: stock_movement PK_9fe1232f916686ae8cf00294749; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movement
    ADD CONSTRAINT "PK_9fe1232f916686ae8cf00294749" PRIMARY KEY (id);


--
-- TOC entry 3967 (class 2606 OID 32570)
-- Name: facet_value_translation PK_a09fdeb788deff7a9ed827a6160; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_value_translation
    ADD CONSTRAINT "PK_a09fdeb788deff7a9ed827a6160" PRIMARY KEY (id);


--
-- TOC entry 3948 (class 2606 OID 32572)
-- Name: facet PK_a0ebfe3c68076820c6886aa9ff3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet
    ADD CONSTRAINT "PK_a0ebfe3c68076820c6886aa9ff3" PRIMARY KEY (id);


--
-- TOC entry 4094 (class 2606 OID 32574)
-- Name: product_variant_facet_values_facet_value PK_a28474836b2feeffcef98c806e1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_facet_values_facet_value
    ADD CONSTRAINT "PK_a28474836b2feeffcef98c806e1" PRIMARY KEY ("productVariantId", "facetValueId");


--
-- TOC entry 3912 (class 2606 OID 32576)
-- Name: collection_asset PK_a2adab6fd086adfb7858f1f110c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_asset
    ADD CONSTRAINT "PK_a2adab6fd086adfb7858f1f110c" PRIMARY KEY (id);


--
-- TOC entry 4178 (class 2606 OID 32578)
-- Name: surcharge PK_a62b89257bcc802b5d77346f432; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surcharge
    ADD CONSTRAINT "PK_a62b89257bcc802b5d77346f432" PRIMARY KEY (id);


--
-- TOC entry 3957 (class 2606 OID 32580)
-- Name: facet_translation PK_a6902cc1dcbb5e52a980f0189ad; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_translation
    ADD CONSTRAINT "PK_a6902cc1dcbb5e52a980f0189ad" PRIMARY KEY (id);


--
-- TOC entry 3930 (class 2606 OID 32582)
-- Name: customer PK_a7a13f4cacb744524e44dfdad32; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT "PK_a7a13f4cacb744524e44dfdad32" PRIMARY KEY (id);


--
-- TOC entry 3908 (class 2606 OID 32584)
-- Name: collection PK_ad3f485bbc99d875491f44d7c85; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection
    ADD CONSTRAINT "PK_ad3f485bbc99d875491f44d7c85" PRIMARY KEY (id);


--
-- TOC entry 4165 (class 2606 OID 32586)
-- Name: stock_location PK_adf770067d0df1421f525fa25cc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_location
    ADD CONSTRAINT "PK_adf770067d0df1421f525fa25cc" PRIMARY KEY (id);


--
-- TOC entry 4037 (class 2606 OID 32588)
-- Name: payment_method_translation PK_ae5ae0af71ae8d15da9eb75768b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_method_translation
    ADD CONSTRAINT "PK_ae5ae0af71ae8d15da9eb75768b" PRIMARY KEY (id);


--
-- TOC entry 4124 (class 2606 OID 32590)
-- Name: role PK_b36bcfe02fc8de3c57a8b2391c2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY (id);


--
-- TOC entry 4193 (class 2606 OID 32592)
-- Name: user_roles_role PK_b47cd6c84ee205ac5a713718292; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles_role
    ADD CONSTRAINT "PK_b47cd6c84ee205ac5a713718292" PRIMARY KEY ("userId", "roleId");


--
-- TOC entry 3976 (class 2606 OID 32594)
-- Name: history_entry PK_b65bd95b0d2929668589d57b97a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_entry
    ADD CONSTRAINT "PK_b65bd95b0d2929668589d57b97a" PRIMARY KEY (id);


--
-- TOC entry 4158 (class 2606 OID 32596)
-- Name: shipping_method_translation PK_b862a1fac1c6e1fd201eadadbcb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method_translation
    ADD CONSTRAINT "PK_b862a1fac1c6e1fd201eadadbcb" PRIMARY KEY (id);


--
-- TOC entry 4151 (class 2606 OID 32598)
-- Name: shipping_method PK_b9b0adfad3c6b99229c1e7d4865; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method
    ADD CONSTRAINT "PK_b9b0adfad3c6b99229c1e7d4865" PRIMARY KEY (id);


--
-- TOC entry 4101 (class 2606 OID 32600)
-- Name: product_variant_price PK_ba659ff2940702124e799c5c854; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_price
    ADD CONSTRAINT "PK_ba659ff2940702124e799c5c854" PRIMARY KEY (id);


--
-- TOC entry 3928 (class 2606 OID 32602)
-- Name: collection_translation PK_bb49cfcde50401eb5f463a84dac; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_translation
    ADD CONSTRAINT "PK_bb49cfcde50401eb5f463a84dac" PRIMARY KEY (id);


--
-- TOC entry 4195 (class 2606 OID 32604)
-- Name: zone PK_bd3989e5a3c3fb5ed546dfaf832; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone
    ADD CONSTRAINT "PK_bd3989e5a3c3fb5ed546dfaf832" PRIMARY KEY (id);


--
-- TOC entry 4040 (class 2606 OID 32606)
-- Name: product PK_bebc9158e480b949565b4dc7a82; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY (id);


--
-- TOC entry 3892 (class 2606 OID 32608)
-- Name: asset_tags_tag PK_c4113b84381e953901fa5553654; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_tags_tag
    ADD CONSTRAINT "PK_c4113b84381e953901fa5553654" PRIMARY KEY ("assetId", "tagId");


--
-- TOC entry 4048 (class 2606 OID 32610)
-- Name: product_asset PK_c56a83efd14ec4175532e1867fc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_asset
    ADD CONSTRAINT "PK_c56a83efd14ec4175532e1867fc" PRIMARY KEY (id);


--
-- TOC entry 4098 (class 2606 OID 32612)
-- Name: product_variant_options_product_option PK_c57de5cb6bb74504180604a00c0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_options_product_option
    ADD CONSTRAINT "PK_c57de5cb6bb74504180604a00c0" PRIMARY KEY ("productVariantId", "productOptionId");


--
-- TOC entry 4034 (class 2606 OID 32614)
-- Name: payment_method_channels_channel PK_c83e4a201c0402ce5cdb170a9a2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_method_channels_channel
    ADD CONSTRAINT "PK_c83e4a201c0402ce5cdb170a9a2" PRIMARY KEY ("paymentMethodId", "channelId");


--
-- TOC entry 4155 (class 2606 OID 32616)
-- Name: shipping_method_channels_channel PK_c92b2b226a6ee87888d8dcd8bd6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method_channels_channel
    ADD CONSTRAINT "PK_c92b2b226a6ee87888d8dcd8bd6" PRIMARY KEY ("shippingMethodId", "channelId");


--
-- TOC entry 4189 (class 2606 OID 32618)
-- Name: user PK_cace4a159ff9f2512dd42373760; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY (id);


--
-- TOC entry 4086 (class 2606 OID 32620)
-- Name: product_variant_asset PK_cb1e33ae13779da176f8b03a5d3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_asset
    ADD CONSTRAINT "PK_cb1e33ae13779da176f8b03a5d3" PRIMARY KEY (id);


--
-- TOC entry 4017 (class 2606 OID 32622)
-- Name: order_modification PK_cccf2e1612694eeb1e5b6760ffa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_modification
    ADD CONSTRAINT "PK_cccf2e1612694eeb1e5b6760ffa" PRIMARY KEY (id);


--
-- TOC entry 3960 (class 2606 OID 32624)
-- Name: facet_value PK_d231e8eecc7e1a6059e1da7d325; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_value
    ADD CONSTRAINT "PK_d231e8eecc7e1a6059e1da7d325" PRIMARY KEY (id);


--
-- TOC entry 4056 (class 2606 OID 32626)
-- Name: product_facet_values_facet_value PK_d57f06b38805181019d75662aa6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_facet_values_facet_value
    ADD CONSTRAINT "PK_d57f06b38805181019d75662aa6" PRIMARY KEY ("productId", "facetValueId");


--
-- TOC entry 4062 (class 2606 OID 32628)
-- Name: product_option_group PK_d76e92fdbbb5a2e6752ffd4a2c1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_group
    ADD CONSTRAINT "PK_d76e92fdbbb5a2e6752ffd4a2c1" PRIMARY KEY (id);


--
-- TOC entry 3874 (class 2606 OID 32630)
-- Name: address PK_d92de1f82754668b5f5f5dd4fd5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT "PK_d92de1f82754668b5f5f5dd4fd5" PRIMARY KEY (id);


--
-- TOC entry 3888 (class 2606 OID 32632)
-- Name: asset_channels_channel PK_d943908a39e32952e8425d2f1ba; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_channels_channel
    ADD CONSTRAINT "PK_d943908a39e32952e8425d2f1ba" PRIMARY KEY ("assetId", "channelId");


--
-- TOC entry 3954 (class 2606 OID 32634)
-- Name: facet_channels_channel PK_df0579886093b2f830c159adfde; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_channels_channel
    ADD CONSTRAINT "PK_df0579886093b2f830c159adfde" PRIMARY KEY ("facetId", "channelId");


--
-- TOC entry 3896 (class 2606 OID 32636)
-- Name: authentication_method PK_e204686018c3c60f6164e385081; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_method
    ADD CONSTRAINT "PK_e204686018c3c60f6164e385081" PRIMARY KEY (id);


--
-- TOC entry 4169 (class 2606 OID 32638)
-- Name: stock_location_channels_channel PK_e6f8b2d61ff58c51505c38da8a0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_location_channels_channel
    ADD CONSTRAINT "PK_e6f8b2d61ff58c51505c38da8a0" PRIMARY KEY ("stockLocationId", "channelId");


--
-- TOC entry 3876 (class 2606 OID 32640)
-- Name: administrator PK_ee58e71b3b4008b20ddc7b3092b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrator
    ADD CONSTRAINT "PK_ee58e71b3b4008b20ddc7b3092b" PRIMARY KEY (id);


--
-- TOC entry 4130 (class 2606 OID 32642)
-- Name: scheduled_task_record PK_efd4b61a3b227f3eba94de32e4c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_task_record
    ADD CONSTRAINT "PK_efd4b61a3b227f3eba94de32e4c" PRIMARY KEY (id);


--
-- TOC entry 4116 (class 2606 OID 32644)
-- Name: refund PK_f1cefa2e60d99b206c46c1116e5; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT "PK_f1cefa2e60d99b206c46c1116e5" PRIMARY KEY (id);


--
-- TOC entry 4145 (class 2606 OID 32646)
-- Name: session PK_f55da76ac1c3ac420f444d2ff11; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY (id);


--
-- TOC entry 4106 (class 2606 OID 32648)
-- Name: promotion PK_fab3630e0789a2002f1cadb7d38; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion
    ADD CONSTRAINT "PK_fab3630e0789a2002f1cadb7d38" PRIMARY KEY (id);


--
-- TOC entry 4199 (class 2606 OID 32650)
-- Name: zone_members_region PK_fc4eaa2236c4d4f61db0ae3826f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_members_region
    ADD CONSTRAINT "PK_fc4eaa2236c4d4f61db0ae3826f" PRIMARY KEY ("zoneId", "regionId");


--
-- TOC entry 4028 (class 2606 OID 32652)
-- Name: payment PK_fcaec7df5adf9cac408c686b2ab; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY (id);


--
-- TOC entry 3971 (class 2606 OID 32654)
-- Name: global_settings PK_fec5e2c0bf238e30b25d4a82976; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_settings
    ADD CONSTRAINT "PK_fec5e2c0bf238e30b25d4a82976" PRIMARY KEY (id);


--
-- TOC entry 3878 (class 2606 OID 32656)
-- Name: administrator REL_1966e18ce6a39a82b19204704d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrator
    ADD CONSTRAINT "REL_1966e18ce6a39a82b19204704d" UNIQUE ("userId");


--
-- TOC entry 3932 (class 2606 OID 32658)
-- Name: customer REL_3f62b42ed23958b120c235f74d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT "REL_3f62b42ed23958b120c235f74d" UNIQUE ("userId");


--
-- TOC entry 4019 (class 2606 OID 32660)
-- Name: order_modification REL_ad2991fa2933ed8b7f86a71633; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_modification
    ADD CONSTRAINT "REL_ad2991fa2933ed8b7f86a71633" UNIQUE ("paymentId");


--
-- TOC entry 4021 (class 2606 OID 32662)
-- Name: order_modification REL_cb66b63b6e97613013795eadbd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_modification
    ADD CONSTRAINT "REL_cb66b63b6e97613013795eadbd" UNIQUE ("refundId");


--
-- TOC entry 3903 (class 2606 OID 32664)
-- Name: channel UQ_06127ac6c6d913f4320759971db; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT "UQ_06127ac6c6d913f4320759971db" UNIQUE (code);


--
-- TOC entry 3950 (class 2606 OID 32666)
-- Name: facet UQ_0c9a5d053fdf4ebb5f0490b40fd; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet
    ADD CONSTRAINT "UQ_0c9a5d053fdf4ebb5f0490b40fd" UNIQUE (code);


--
-- TOC entry 3880 (class 2606 OID 32668)
-- Name: administrator UQ_154f5c538b1576ccc277b1ed631; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrator
    ADD CONSTRAINT "UQ_154f5c538b1576ccc277b1ed631" UNIQUE ("emailAddress");


--
-- TOC entry 4132 (class 2606 OID 32670)
-- Name: scheduled_task_record UQ_661876d97056cad9fd37eaa8774; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_task_record
    ADD CONSTRAINT "UQ_661876d97056cad9fd37eaa8774" UNIQUE ("taskId");


--
-- TOC entry 3905 (class 2606 OID 32672)
-- Name: channel UQ_842699fce4f3470a7d06d89de88; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT "UQ_842699fce4f3470a7d06d89de88" UNIQUE (token);


--
-- TOC entry 3893 (class 1259 OID 32673)
-- Name: IDX_00cbe87bc0d4e36758d61bd31d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_00cbe87bc0d4e36758d61bd31d" ON public.authentication_method USING btree ("userId");


--
-- TOC entry 4008 (class 1259 OID 32674)
-- Name: IDX_06b02fb482b188823e419d37bd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_06b02fb482b188823e419d37bd" ON public.order_line_reference USING btree ("fulfillmentId");


--
-- TOC entry 4053 (class 1259 OID 32675)
-- Name: IDX_06e7d73673ee630e8ec50d0b29; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_06e7d73673ee630e8ec50d0b29" ON public.product_facet_values_facet_value USING btree ("facetValueId");


--
-- TOC entry 4045 (class 1259 OID 32676)
-- Name: IDX_0d1294f5c22a56da7845ebab72; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0d1294f5c22a56da7845ebab72" ON public.product_asset USING btree ("productId");


--
-- TOC entry 4091 (class 1259 OID 32677)
-- Name: IDX_0d641b761ed1dce4ef3cd33d55; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0d641b761ed1dce4ef3cd33d55" ON public.product_variant_facet_values_facet_value USING btree ("facetValueId");


--
-- TOC entry 3992 (class 1259 OID 32678)
-- Name: IDX_0d8e5c204480204a60e151e485; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0d8e5c204480204a60e151e485" ON public.order_channels_channel USING btree ("orderId");


--
-- TOC entry 4073 (class 1259 OID 32679)
-- Name: IDX_0e6f516053cf982b537836e21c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0e6f516053cf982b537836e21c" ON public.product_variant USING btree ("featuredAssetId");


--
-- TOC entry 4107 (class 1259 OID 32680)
-- Name: IDX_0eaaf0f4b6c69afde1e88ffb52; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_0eaaf0f4b6c69afde1e88ffb52" ON public.promotion_channels_channel USING btree ("channelId");


--
-- TOC entry 4083 (class 1259 OID 32681)
-- Name: IDX_10b5a2e3dee0e30b1e26c32f5c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_10b5a2e3dee0e30b1e26c32f5c" ON public.product_variant_asset USING btree ("assetId");


--
-- TOC entry 3983 (class 1259 OID 32682)
-- Name: IDX_124456e637cca7a415897dce65; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_124456e637cca7a415897dce65" ON public."order" USING btree ("customerId");


--
-- TOC entry 4175 (class 1259 OID 32683)
-- Name: IDX_154eb685f9b629033bd266df7f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_154eb685f9b629033bd266df7f" ON public.surcharge USING btree ("orderId");


--
-- TOC entry 3885 (class 1259 OID 32684)
-- Name: IDX_16ca9151a5153f1169da5b7b7e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_16ca9151a5153f1169da5b7b7e" ON public.asset_channels_channel USING btree ("channelId");


--
-- TOC entry 4120 (class 1259 OID 32685)
-- Name: IDX_1afd722b943c81310705fc3e61; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1afd722b943c81310705fc3e61" ON public.region_translation USING btree ("baseId");


--
-- TOC entry 4114 (class 1259 OID 32686)
-- Name: IDX_1c6932a756108788a361e7d440; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1c6932a756108788a361e7d440" ON public.refund USING btree ("paymentId");


--
-- TOC entry 4111 (class 1259 OID 32687)
-- Name: IDX_1cc009e9ab2263a35544064561; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1cc009e9ab2263a35544064561" ON public.promotion_translation USING btree ("baseId");


--
-- TOC entry 4015 (class 1259 OID 32688)
-- Name: IDX_1df5bc14a47ef24d2e681f4559; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1df5bc14a47ef24d2e681f4559" ON public.order_modification USING btree ("orderId");


--
-- TOC entry 3909 (class 1259 OID 32689)
-- Name: IDX_1ed9e48dfbf74b5fcbb35d3d68; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1ed9e48dfbf74b5fcbb35d3d68" ON public.collection_asset USING btree ("collectionId");


--
-- TOC entry 4009 (class 1259 OID 32690)
-- Name: IDX_22b818af8722746fb9f206068c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_22b818af8722746fb9f206068c" ON public.order_line_reference USING btree ("modificationId");


--
-- TOC entry 4140 (class 1259 OID 32691)
-- Name: IDX_232f8e85d7633bd6ddfad42169; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_232f8e85d7633bd6ddfad42169" ON public.session USING btree (token);


--
-- TOC entry 4000 (class 1259 OID 32692)
-- Name: IDX_239cfca2a55b98b90b6bef2e44; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_239cfca2a55b98b90b6bef2e44" ON public.order_line USING btree ("orderId");


--
-- TOC entry 4049 (class 1259 OID 32693)
-- Name: IDX_26d12be3b5fec6c4adb1d79284; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_26d12be3b5fec6c4adb1d79284" ON public.product_channels_channel USING btree ("productId");


--
-- TOC entry 3951 (class 1259 OID 32694)
-- Name: IDX_2a8ea404d05bf682516184db7d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2a8ea404d05bf682516184db7d" ON public.facet_channels_channel USING btree ("channelId");


--
-- TOC entry 4022 (class 1259 OID 32695)
-- Name: IDX_2c26b988769c0e3b0120bdef31; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2c26b988769c0e3b0120bdef31" ON public.order_promotions_promotion USING btree ("promotionId");


--
-- TOC entry 4010 (class 1259 OID 32696)
-- Name: IDX_30019aa65b17fe9ee962893199; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_30019aa65b17fe9ee962893199" ON public.order_line_reference USING btree ("refundId");


--
-- TOC entry 4166 (class 1259 OID 32697)
-- Name: IDX_39513fd02a573c848d23bee587; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_39513fd02a573c848d23bee587" ON public.stock_location_channels_channel USING btree ("stockLocationId");


--
-- TOC entry 3972 (class 1259 OID 32698)
-- Name: IDX_3a05127e67435b4d2332ded7c9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3a05127e67435b4d2332ded7c9" ON public.history_entry USING btree ("orderId");


--
-- TOC entry 4141 (class 1259 OID 32699)
-- Name: IDX_3d2f174ef04fb312fdebd0ddc5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3d2f174ef04fb312fdebd0ddc5" ON public.session USING btree ("userId");


--
-- TOC entry 3965 (class 1259 OID 32700)
-- Name: IDX_3d6e45823b65de808a66cb1423; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3d6e45823b65de808a66cb1423" ON public.facet_value_translation USING btree ("baseId");


--
-- TOC entry 4102 (class 1259 OID 32701)
-- Name: IDX_420f4d6fb75d38b9dca79bc43b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_420f4d6fb75d38b9dca79bc43b" ON public.product_variant_translation USING btree ("baseId");


--
-- TOC entry 4196 (class 1259 OID 32702)
-- Name: IDX_433f45158e4e2b2a2f344714b2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_433f45158e4e2b2a2f344714b2" ON public.zone_members_region USING btree ("zoneId");


--
-- TOC entry 3973 (class 1259 OID 32703)
-- Name: IDX_43ac602f839847fdb91101f30e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_43ac602f839847fdb91101f30e" ON public.history_entry USING btree ("customerId");


--
-- TOC entry 3917 (class 1259 OID 32704)
-- Name: IDX_457784c710f8ac9396010441f6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_457784c710f8ac9396010441f6" ON public.collection_closure USING btree (id_descendant);


--
-- TOC entry 4011 (class 1259 OID 32705)
-- Name: IDX_49a8632be8cef48b076446b8b9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_49a8632be8cef48b076446b8b9" ON public.order_line_reference USING btree (discriminator);


--
-- TOC entry 3996 (class 1259 OID 32706)
-- Name: IDX_4add5a5796e1582dec2877b289; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4add5a5796e1582dec2877b289" ON public.order_fulfillments_fulfillment USING btree ("fulfillmentId");


--
-- TOC entry 4190 (class 1259 OID 32707)
-- Name: IDX_4be2f7adf862634f5f803d246b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4be2f7adf862634f5f803d246b" ON public.user_roles_role USING btree ("roleId");


--
-- TOC entry 3910 (class 1259 OID 32708)
-- Name: IDX_51da53b26522dc0525762d2de8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_51da53b26522dc0525762d2de8" ON public.collection_asset USING btree ("assetId");


--
-- TOC entry 4095 (class 1259 OID 32709)
-- Name: IDX_526f0131260eec308a3bd2b61b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_526f0131260eec308a3bd2b61b" ON public.product_variant_options_product_option USING btree ("productVariantId");


--
-- TOC entry 4046 (class 1259 OID 32710)
-- Name: IDX_5888ac17b317b93378494a1062; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5888ac17b317b93378494a1062" ON public.product_asset USING btree ("assetId");


--
-- TOC entry 4031 (class 1259 OID 32711)
-- Name: IDX_5bcb569635ce5407eb3f264487; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5bcb569635ce5407eb3f264487" ON public.payment_method_channels_channel USING btree ("paymentMethodId");


--
-- TOC entry 4191 (class 1259 OID 32712)
-- Name: IDX_5f9286e6c25594c6b88c108db7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5f9286e6c25594c6b88c108db7" ON public.user_roles_role USING btree ("userId");


--
-- TOC entry 4035 (class 1259 OID 32713)
-- Name: IDX_66187f782a3e71b9e0f5b50b68; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_66187f782a3e71b9e0f5b50b68" ON public.payment_method_translation USING btree ("baseId");


--
-- TOC entry 4023 (class 1259 OID 32714)
-- Name: IDX_67be0e40122ab30a62a9817efe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_67be0e40122ab30a62a9817efe" ON public.order_promotions_promotion USING btree ("orderId");


--
-- TOC entry 4001 (class 1259 OID 32715)
-- Name: IDX_6901d8715f5ebadd764466f7bd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6901d8715f5ebadd764466f7bd" ON public.order_line USING btree ("sellerChannelId");


--
-- TOC entry 4092 (class 1259 OID 32716)
-- Name: IDX_69567bc225b6bbbd732d6c5455; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_69567bc225b6bbbd732d6c5455" ON public.product_variant_facet_values_facet_value USING btree ("productVariantId");


--
-- TOC entry 4054 (class 1259 OID 32717)
-- Name: IDX_6a0558e650d75ae639ff38e413; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6a0558e650d75ae639ff38e413" ON public.product_facet_values_facet_value USING btree ("productId");


--
-- TOC entry 4108 (class 1259 OID 32718)
-- Name: IDX_6d9e2c39ab12391aaa374bcdaa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6d9e2c39ab12391aaa374bcdaa" ON public.promotion_channels_channel USING btree ("promotionId");


--
-- TOC entry 4074 (class 1259 OID 32719)
-- Name: IDX_6e420052844edf3a5506d863ce; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6e420052844edf3a5506d863ce" ON public.product_variant USING btree ("productId");


--
-- TOC entry 3921 (class 1259 OID 32720)
-- Name: IDX_6faa7b72422d9c4679e2f186ad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6faa7b72422d9c4679e2f186ad" ON public.collection_product_variants_product_variant USING btree ("collectionId");


--
-- TOC entry 4133 (class 1259 OID 32721)
-- Name: IDX_6fb55742e13e8082954d0436dc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6fb55742e13e8082954d0436dc" ON public.search_index_item USING btree ("productName");


--
-- TOC entry 3913 (class 1259 OID 32722)
-- Name: IDX_7216ab24077cf5cbece7857dbb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7216ab24077cf5cbece7857dbb" ON public.collection_channels_channel USING btree ("channelId");


--
-- TOC entry 3906 (class 1259 OID 32723)
-- Name: IDX_7256fef1bb42f1b38156b7449f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7256fef1bb42f1b38156b7449f" ON public.collection USING btree ("featuredAssetId");


--
-- TOC entry 3984 (class 1259 OID 32724)
-- Name: IDX_729b3eea7ce540930dbb706949; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_729b3eea7ce540930dbb706949" ON public."order" USING btree (code);


--
-- TOC entry 3985 (class 1259 OID 32725)
-- Name: IDX_73a78d7df09541ac5eba620d18; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_73a78d7df09541ac5eba620d18" ON public."order" USING btree ("aggregateOrderId");


--
-- TOC entry 4002 (class 1259 OID 32726)
-- Name: IDX_77be94ce9ec650446617946227; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_77be94ce9ec650446617946227" ON public.order_line USING btree ("taxCategoryId");


--
-- TOC entry 4142 (class 1259 OID 32727)
-- Name: IDX_7a75399a4f4ffa48ee02e98c05; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7a75399a4f4ffa48ee02e98c05" ON public.session USING btree ("activeOrderId");


--
-- TOC entry 4012 (class 1259 OID 32728)
-- Name: IDX_7d57857922dfc7303604697dbe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7d57857922dfc7303604697dbe" ON public.order_line_reference USING btree ("orderLineId");


--
-- TOC entry 4069 (class 1259 OID 32729)
-- Name: IDX_7dbc75cb4e8b002620c4dbfdac; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7dbc75cb4e8b002620c4dbfdac" ON public.product_translation USING btree ("baseId");


--
-- TOC entry 4183 (class 1259 OID 32730)
-- Name: IDX_7ee3306d7638aa85ca90d67219; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_7ee3306d7638aa85ca90d67219" ON public.tax_rate USING btree ("categoryId");


--
-- TOC entry 4159 (class 1259 OID 32731)
-- Name: IDX_7fc20486b8cfd33dc84c96e168; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_7fc20486b8cfd33dc84c96e168" ON public.stock_level USING btree ("productVariantId", "stockLocationId");


--
-- TOC entry 4156 (class 1259 OID 32732)
-- Name: IDX_85ec26c71067ebc84adcd98d1a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_85ec26c71067ebc84adcd98d1a" ON public.shipping_method_translation USING btree ("baseId");


--
-- TOC entry 3943 (class 1259 OID 32733)
-- Name: IDX_85feea3f0e5e82133605f78db0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_85feea3f0e5e82133605f78db0" ON public.customer_groups_customer_group USING btree ("customerGroupId");


--
-- TOC entry 4184 (class 1259 OID 32734)
-- Name: IDX_8b5ab52fc8887c1a769b9276ca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8b5ab52fc8887c1a769b9276ca" ON public.tax_rate USING btree ("customerGroupId");


--
-- TOC entry 4038 (class 1259 OID 32735)
-- Name: IDX_91a19e6613534949a4ce6e76ff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_91a19e6613534949a4ce6e76ff" ON public.product USING btree ("featuredAssetId");


--
-- TOC entry 3974 (class 1259 OID 32736)
-- Name: IDX_92f8c334ef06275f9586fd0183; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_92f8c334ef06275f9586fd0183" ON public.history_entry USING btree ("administratorId");


--
-- TOC entry 4063 (class 1259 OID 32737)
-- Name: IDX_93751abc1451972c02e033b766; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_93751abc1451972c02e033b766" ON public.product_option_group_translation USING btree ("baseId");


--
-- TOC entry 4160 (class 1259 OID 32738)
-- Name: IDX_984c48572468c69661a0b7b049; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_984c48572468c69661a0b7b049" ON public.stock_level USING btree ("stockLocationId");


--
-- TOC entry 4185 (class 1259 OID 32739)
-- Name: IDX_9872fc7de2f4e532fd3230d191; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9872fc7de2f4e532fd3230d191" ON public.tax_rate USING btree ("zoneId");


--
-- TOC entry 4161 (class 1259 OID 32740)
-- Name: IDX_9950eae3180f39c71978748bd0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9950eae3180f39c71978748bd0" ON public.stock_level USING btree ("productVariantId");


--
-- TOC entry 4134 (class 1259 OID 32741)
-- Name: IDX_9a5a6a556f75c4ac7bfdd03410; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9a5a6a556f75c4ac7bfdd03410" ON public.search_index_item USING btree (description);


--
-- TOC entry 3889 (class 1259 OID 32742)
-- Name: IDX_9e412b00d4c6cee1a4b3d92071; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9e412b00d4c6cee1a4b3d92071" ON public.asset_tags_tag USING btree ("assetId");


--
-- TOC entry 4003 (class 1259 OID 32743)
-- Name: IDX_9f065453910ea77d4be8e92618; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9f065453910ea77d4be8e92618" ON public.order_line USING btree ("featuredAssetId");


--
-- TOC entry 3925 (class 1259 OID 32744)
-- Name: IDX_9f9da7d94b0278ea0f7831e1fc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9f9da7d94b0278ea0f7831e1fc" ON public.collection_translation USING btree (slug);


--
-- TOC entry 3894 (class 1259 OID 32745)
-- Name: IDX_a23445b2c942d8dfcae15b8de2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a23445b2c942d8dfcae15b8de2" ON public.authentication_method USING btree (type);


--
-- TOC entry 4170 (class 1259 OID 32746)
-- Name: IDX_a2fe7172eeae9f1cca86f8f573; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a2fe7172eeae9f1cca86f8f573" ON public.stock_movement USING btree ("stockLocationId");


--
-- TOC entry 4176 (class 1259 OID 32747)
-- Name: IDX_a49c5271c39cc8174a0535c808; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a49c5271c39cc8174a0535c808" ON public.surcharge USING btree ("orderModificationId");


--
-- TOC entry 4050 (class 1259 OID 32748)
-- Name: IDX_a51dfbd87c330c075c39832b6e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a51dfbd87c330c075c39832b6e" ON public.product_channels_channel USING btree ("channelId");


--
-- TOC entry 4057 (class 1259 OID 32749)
-- Name: IDX_a6debf9198e2fbfa006aa10d71; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a6debf9198e2fbfa006aa10d71" ON public.product_option USING btree ("groupId");


--
-- TOC entry 4060 (class 1259 OID 32750)
-- Name: IDX_a6e91739227bf4d442f23c52c7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a6e91739227bf4d442f23c52c7" ON public.product_option_group USING btree ("productId");


--
-- TOC entry 4066 (class 1259 OID 32751)
-- Name: IDX_a79a443c1f7841f3851767faa6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a79a443c1f7841f3851767faa6" ON public.product_option_translation USING btree ("baseId");


--
-- TOC entry 3937 (class 1259 OID 32752)
-- Name: IDX_a842c9fe8cd4c8ff31402d172d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_a842c9fe8cd4c8ff31402d172d" ON public.customer_channels_channel USING btree ("customerId");


--
-- TOC entry 3961 (class 1259 OID 32753)
-- Name: IDX_ad690c1b05596d7f52e52ffeed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ad690c1b05596d7f52e52ffeed" ON public.facet_value_channels_channel USING btree ("facetValueId");


--
-- TOC entry 3897 (class 1259 OID 32754)
-- Name: IDX_af2116c7e176b6b88dceceeb74; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_af2116c7e176b6b88dceceeb74" ON public.channel USING btree ("sellerId");


--
-- TOC entry 3898 (class 1259 OID 32755)
-- Name: IDX_afe9f917a1c82b9e9e69f7c612; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_afe9f917a1c82b9e9e69f7c612" ON public.channel USING btree ("defaultTaxZoneId");


--
-- TOC entry 4197 (class 1259 OID 32756)
-- Name: IDX_b45b65256486a15a104e17d495; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b45b65256486a15a104e17d495" ON public.zone_members_region USING btree ("regionId");


--
-- TOC entry 3944 (class 1259 OID 32757)
-- Name: IDX_b823a3c8bf3b78d3ed68736485; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b823a3c8bf3b78d3ed68736485" ON public.customer_groups_customer_group USING btree ("customerId");


--
-- TOC entry 4087 (class 1259 OID 32758)
-- Name: IDX_beeb2b3cd800e589f2213ae99d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_beeb2b3cd800e589f2213ae99d" ON public.product_variant_channels_channel USING btree ("productVariantId");


--
-- TOC entry 4125 (class 1259 OID 32759)
-- Name: IDX_bfd2a03e9988eda6a9d1176011; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_bfd2a03e9988eda6a9d1176011" ON public.role_channels_channel USING btree ("roleId");


--
-- TOC entry 4032 (class 1259 OID 32760)
-- Name: IDX_c00e36f667d35031087b382e61; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c00e36f667d35031087b382e61" ON public.payment_method_channels_channel USING btree ("channelId");


--
-- TOC entry 3918 (class 1259 OID 32761)
-- Name: IDX_c309f8cd152bbeaea08491e0c6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c309f8cd152bbeaea08491e0c6" ON public.collection_closure USING btree (id_ancestor);


--
-- TOC entry 3899 (class 1259 OID 32762)
-- Name: IDX_c9ca2f58d4517460435cbd8b4c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c9ca2f58d4517460435cbd8b4c" ON public.channel USING btree ("defaultShippingZoneId");


--
-- TOC entry 4146 (class 1259 OID 32763)
-- Name: IDX_c9f34a440d490d1b66f6829b86; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c9f34a440d490d1b66f6829b86" ON public.shipping_line USING btree ("orderId");


--
-- TOC entry 3952 (class 1259 OID 32764)
-- Name: IDX_ca796020c6d097e251e5d6d2b0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ca796020c6d097e251e5d6d2b0" ON public.facet_channels_channel USING btree ("facetId");


--
-- TOC entry 4004 (class 1259 OID 32765)
-- Name: IDX_cbcd22193eda94668e84d33f18; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_cbcd22193eda94668e84d33f18" ON public.order_line USING btree ("productVariantId");


--
-- TOC entry 3914 (class 1259 OID 32766)
-- Name: IDX_cdbf33ffb5d451916125152008; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_cdbf33ffb5d451916125152008" ON public.collection_channels_channel USING btree ("collectionId");


--
-- TOC entry 4026 (class 1259 OID 32767)
-- Name: IDX_d09d285fe1645cd2f0db811e29; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d09d285fe1645cd2f0db811e29" ON public.payment USING btree ("orderId");


--
-- TOC entry 3993 (class 1259 OID 32768)
-- Name: IDX_d0d16db872499e83b15999f8c7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d0d16db872499e83b15999f8c7" ON public.order_channels_channel USING btree ("channelId");


--
-- TOC entry 3958 (class 1259 OID 32769)
-- Name: IDX_d101dc2265a7341be3d94968c5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d101dc2265a7341be3d94968c5" ON public.facet_value USING btree ("facetId");


--
-- TOC entry 4088 (class 1259 OID 32770)
-- Name: IDX_d194bff171b62357688a5d0f55; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d194bff171b62357688a5d0f55" ON public.product_variant_channels_channel USING btree ("channelId");


--
-- TOC entry 4171 (class 1259 OID 32771)
-- Name: IDX_d2c8d5fca981cc820131f81aa8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d2c8d5fca981cc820131f81aa8" ON public.stock_movement USING btree ("orderLineId");


--
-- TOC entry 3871 (class 1259 OID 32772)
-- Name: IDX_d87215343c3a3a67e6a0b7f3ea; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d87215343c3a3a67e6a0b7f3ea" ON public.address USING btree ("countryId");


--
-- TOC entry 4135 (class 1259 OID 32773)
-- Name: IDX_d8791f444a8bf23fe4c1bc020c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d8791f444a8bf23fe4c1bc020c" ON public.search_index_item USING btree ("productVariantName");


--
-- TOC entry 3872 (class 1259 OID 32774)
-- Name: IDX_dc34d382b493ade1f70e834c4d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dc34d382b493ade1f70e834c4d" ON public.address USING btree ("customerId");


--
-- TOC entry 3886 (class 1259 OID 32775)
-- Name: IDX_dc4e7435f9f5e9e6436bebd33b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dc4e7435f9f5e9e6436bebd33b" ON public.asset_channels_channel USING btree ("assetId");


--
-- TOC entry 4005 (class 1259 OID 32776)
-- Name: IDX_dc9ac68b47da7b62249886affb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dc9ac68b47da7b62249886affb" ON public.order_line USING btree ("shippingLineId");


--
-- TOC entry 3938 (class 1259 OID 32777)
-- Name: IDX_dc9f69207a8867f83b0fd257e3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_dc9f69207a8867f83b0fd257e3" ON public.customer_channels_channel USING btree ("channelId");


--
-- TOC entry 4126 (class 1259 OID 32778)
-- Name: IDX_e09dfee62b158307404202b43a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e09dfee62b158307404202b43a" ON public.role_channels_channel USING btree ("channelId");


--
-- TOC entry 3962 (class 1259 OID 32779)
-- Name: IDX_e1d54c0b9db3e2eb17faaf5919; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e1d54c0b9db3e2eb17faaf5919" ON public.facet_value_channels_channel USING btree ("channelId");


--
-- TOC entry 4147 (class 1259 OID 32780)
-- Name: IDX_e2e7642e1e88167c1dfc827fdf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e2e7642e1e88167c1dfc827fdf" ON public.shipping_line USING btree ("shippingMethodId");


--
-- TOC entry 3926 (class 1259 OID 32781)
-- Name: IDX_e329f9036210d75caa1d8f2154; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e329f9036210d75caa1d8f2154" ON public.collection_translation USING btree ("baseId");


--
-- TOC entry 4075 (class 1259 OID 32782)
-- Name: IDX_e38dca0d82fd64c7cf8aac8b8e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e38dca0d82fd64c7cf8aac8b8e" ON public.product_variant USING btree ("taxCategoryId");


--
-- TOC entry 4099 (class 1259 OID 32783)
-- Name: IDX_e6126cd268aea6e9b31d89af9a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e6126cd268aea6e9b31d89af9a" ON public.product_variant_price USING btree ("variantId");


--
-- TOC entry 4172 (class 1259 OID 32784)
-- Name: IDX_e65ba3882557cab4febb54809b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e65ba3882557cab4febb54809b" ON public.stock_movement USING btree ("productVariantId");


--
-- TOC entry 4096 (class 1259 OID 32785)
-- Name: IDX_e96a71affe63c97f7fa2f076da; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e96a71affe63c97f7fa2f076da" ON public.product_variant_options_product_option USING btree ("productOptionId");


--
-- TOC entry 3955 (class 1259 OID 32786)
-- Name: IDX_eaea53f44bf9e97790d38a3d68; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_eaea53f44bf9e97790d38a3d68" ON public.facet_translation USING btree ("baseId");


--
-- TOC entry 4143 (class 1259 OID 32787)
-- Name: IDX_eb87ef1e234444728138302263; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_eb87ef1e234444728138302263" ON public.session USING btree ("activeChannelId");


--
-- TOC entry 4117 (class 1259 OID 32788)
-- Name: IDX_ed0c8098ce6809925a437f42ae; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ed0c8098ce6809925a437f42ae" ON public.region USING btree ("parentId");


--
-- TOC entry 4152 (class 1259 OID 32789)
-- Name: IDX_f0a17b94aa5a162f0d422920eb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f0a17b94aa5a162f0d422920eb" ON public.shipping_method_channels_channel USING btree ("shippingMethodId");


--
-- TOC entry 4153 (class 1259 OID 32790)
-- Name: IDX_f2b98dfb56685147bed509acc3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f2b98dfb56685147bed509acc3" ON public.shipping_method_channels_channel USING btree ("channelId");


--
-- TOC entry 4070 (class 1259 OID 32791)
-- Name: IDX_f4a2ec16ba86d277b6faa0b67b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f4a2ec16ba86d277b6faa0b67b" ON public.product_translation USING btree (slug);


--
-- TOC entry 3997 (class 1259 OID 32792)
-- Name: IDX_f80d84d525af2ffe974e7e8ca2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_f80d84d525af2ffe974e7e8ca2" ON public.order_fulfillments_fulfillment USING btree ("orderId");


--
-- TOC entry 4084 (class 1259 OID 32793)
-- Name: IDX_fa21412afac15a2304f3eb35fe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_fa21412afac15a2304f3eb35fe" ON public.product_variant_asset USING btree ("productVariantId");


--
-- TOC entry 3922 (class 1259 OID 32794)
-- Name: IDX_fb05887e2867365f236d7dd95e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_fb05887e2867365f236d7dd95e" ON public.collection_product_variants_product_variant USING btree ("productVariantId");


--
-- TOC entry 3890 (class 1259 OID 32795)
-- Name: IDX_fb5e800171ffbe9823f2cc727f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_fb5e800171ffbe9823f2cc727f" ON public.asset_tags_tag USING btree ("tagId");


--
-- TOC entry 4167 (class 1259 OID 32796)
-- Name: IDX_ff8150fe54e56a900d5712671a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ff8150fe54e56a900d5712671a" ON public.stock_location_channels_channel USING btree ("channelId");


--
-- TOC entry 3883 (class 1259 OID 92198)
-- Name: idx_asset_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_created_at ON public.asset USING btree ("createdAt");


--
-- TOC entry 3884 (class 1259 OID 92197)
-- Name: idx_asset_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_name ON public.asset USING btree (name);


--
-- TOC entry 3933 (class 1259 OID 92194)
-- Name: idx_customer_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_created_at ON public.customer USING btree ("createdAt");


--
-- TOC entry 3934 (class 1259 OID 92196)
-- Name: idx_customer_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_deleted_at ON public.customer USING btree ("deletedAt");


--
-- TOC entry 3935 (class 1259 OID 92193)
-- Name: idx_customer_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_email ON public.customer USING btree ("emailAddress");


--
-- TOC entry 3936 (class 1259 OID 92195)
-- Name: idx_customer_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_updated_at ON public.customer USING btree ("updatedAt");


--
-- TOC entry 3988 (class 1259 OID 92181)
-- Name: idx_order_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_active ON public."order" USING btree (active);


--
-- TOC entry 3989 (class 1259 OID 92182)
-- Name: idx_order_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_created_at ON public."order" USING btree ("createdAt");


--
-- TOC entry 3990 (class 1259 OID 92180)
-- Name: idx_order_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_state ON public."order" USING btree (state);


--
-- TOC entry 3991 (class 1259 OID 92183)
-- Name: idx_order_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_updated_at ON public."order" USING btree ("updatedAt");


--
-- TOC entry 4041 (class 1259 OID 92185)
-- Name: idx_product_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_created_at ON public.product USING btree ("createdAt");


--
-- TOC entry 4042 (class 1259 OID 92187)
-- Name: idx_product_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_deleted_at ON public.product USING btree ("deletedAt");


--
-- TOC entry 4043 (class 1259 OID 92184)
-- Name: idx_product_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_enabled ON public.product USING btree (enabled);


--
-- TOC entry 4044 (class 1259 OID 92186)
-- Name: idx_product_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_updated_at ON public.product USING btree ("updatedAt");


--
-- TOC entry 4078 (class 1259 OID 92190)
-- Name: idx_product_variant_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variant_created_at ON public.product_variant USING btree ("createdAt");


--
-- TOC entry 4079 (class 1259 OID 92192)
-- Name: idx_product_variant_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variant_deleted_at ON public.product_variant USING btree ("deletedAt");


--
-- TOC entry 4080 (class 1259 OID 92188)
-- Name: idx_product_variant_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variant_enabled ON public.product_variant USING btree (enabled);


--
-- TOC entry 4081 (class 1259 OID 92189)
-- Name: idx_product_variant_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variant_sku ON public.product_variant USING btree (sku);


--
-- TOC entry 4082 (class 1259 OID 92191)
-- Name: idx_product_variant_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variant_updated_at ON public.product_variant USING btree ("updatedAt");


--
-- TOC entry 4207 (class 2606 OID 32797)
-- Name: authentication_method FK_00cbe87bc0d4e36758d61bd31d6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_method
    ADD CONSTRAINT "FK_00cbe87bc0d4e36758d61bd31d6" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- TOC entry 4249 (class 2606 OID 32802)
-- Name: order_line_reference FK_06b02fb482b188823e419d37bd4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_reference
    ADD CONSTRAINT "FK_06b02fb482b188823e419d37bd4" FOREIGN KEY ("fulfillmentId") REFERENCES public.fulfillment(id);


--
-- TOC entry 4267 (class 2606 OID 32807)
-- Name: product_facet_values_facet_value FK_06e7d73673ee630e8ec50d0b29f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_facet_values_facet_value
    ADD CONSTRAINT "FK_06e7d73673ee630e8ec50d0b29f" FOREIGN KEY ("facetValueId") REFERENCES public.facet_value(id) ON DELETE CASCADE;


--
-- TOC entry 4263 (class 2606 OID 32812)
-- Name: product_asset FK_0d1294f5c22a56da7845ebab72c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_asset
    ADD CONSTRAINT "FK_0d1294f5c22a56da7845ebab72c" FOREIGN KEY ("productId") REFERENCES public.product(id) ON DELETE CASCADE;


--
-- TOC entry 4281 (class 2606 OID 32817)
-- Name: product_variant_facet_values_facet_value FK_0d641b761ed1dce4ef3cd33d559; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_facet_values_facet_value
    ADD CONSTRAINT "FK_0d641b761ed1dce4ef3cd33d559" FOREIGN KEY ("facetValueId") REFERENCES public.facet_value(id);


--
-- TOC entry 4239 (class 2606 OID 32822)
-- Name: order_channels_channel FK_0d8e5c204480204a60e151e4853; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_channels_channel
    ADD CONSTRAINT "FK_0d8e5c204480204a60e151e4853" FOREIGN KEY ("orderId") REFERENCES public."order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4274 (class 2606 OID 32827)
-- Name: product_variant FK_0e6f516053cf982b537836e21cf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT "FK_0e6f516053cf982b537836e21cf" FOREIGN KEY ("featuredAssetId") REFERENCES public.asset(id) ON DELETE SET NULL;


--
-- TOC entry 4287 (class 2606 OID 32832)
-- Name: promotion_channels_channel FK_0eaaf0f4b6c69afde1e88ffb52d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_channels_channel
    ADD CONSTRAINT "FK_0eaaf0f4b6c69afde1e88ffb52d" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4277 (class 2606 OID 32837)
-- Name: product_variant_asset FK_10b5a2e3dee0e30b1e26c32f5c7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_asset
    ADD CONSTRAINT "FK_10b5a2e3dee0e30b1e26c32f5c7" FOREIGN KEY ("assetId") REFERENCES public.asset(id) ON DELETE CASCADE;


--
-- TOC entry 4237 (class 2606 OID 32842)
-- Name: order FK_124456e637cca7a415897dce659; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT "FK_124456e637cca7a415897dce659" FOREIGN KEY ("customerId") REFERENCES public.customer(id);


--
-- TOC entry 4310 (class 2606 OID 32847)
-- Name: surcharge FK_154eb685f9b629033bd266df7fa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surcharge
    ADD CONSTRAINT "FK_154eb685f9b629033bd266df7fa" FOREIGN KEY ("orderId") REFERENCES public."order"(id) ON DELETE CASCADE;


--
-- TOC entry 4203 (class 2606 OID 32852)
-- Name: asset_channels_channel FK_16ca9151a5153f1169da5b7b7e3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_channels_channel
    ADD CONSTRAINT "FK_16ca9151a5153f1169da5b7b7e3" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4202 (class 2606 OID 32857)
-- Name: administrator FK_1966e18ce6a39a82b19204704d7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrator
    ADD CONSTRAINT "FK_1966e18ce6a39a82b19204704d7" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- TOC entry 4292 (class 2606 OID 32862)
-- Name: region_translation FK_1afd722b943c81310705fc3e612; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.region_translation
    ADD CONSTRAINT "FK_1afd722b943c81310705fc3e612" FOREIGN KEY ("baseId") REFERENCES public.region(id) ON DELETE CASCADE;


--
-- TOC entry 4290 (class 2606 OID 32867)
-- Name: refund FK_1c6932a756108788a361e7d4404; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund
    ADD CONSTRAINT "FK_1c6932a756108788a361e7d4404" FOREIGN KEY ("paymentId") REFERENCES public.payment(id);


--
-- TOC entry 4289 (class 2606 OID 32872)
-- Name: promotion_translation FK_1cc009e9ab2263a35544064561b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_translation
    ADD CONSTRAINT "FK_1cc009e9ab2263a35544064561b" FOREIGN KEY ("baseId") REFERENCES public.promotion(id) ON DELETE CASCADE;


--
-- TOC entry 4253 (class 2606 OID 32877)
-- Name: order_modification FK_1df5bc14a47ef24d2e681f45598; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_modification
    ADD CONSTRAINT "FK_1df5bc14a47ef24d2e681f45598" FOREIGN KEY ("orderId") REFERENCES public."order"(id) ON DELETE CASCADE;


--
-- TOC entry 4213 (class 2606 OID 32882)
-- Name: collection_asset FK_1ed9e48dfbf74b5fcbb35d3d686; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_asset
    ADD CONSTRAINT "FK_1ed9e48dfbf74b5fcbb35d3d686" FOREIGN KEY ("collectionId") REFERENCES public.collection(id) ON DELETE CASCADE;


--
-- TOC entry 4250 (class 2606 OID 32887)
-- Name: order_line_reference FK_22b818af8722746fb9f206068c2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_reference
    ADD CONSTRAINT "FK_22b818af8722746fb9f206068c2" FOREIGN KEY ("modificationId") REFERENCES public.order_modification(id);


--
-- TOC entry 4243 (class 2606 OID 32892)
-- Name: order_line FK_239cfca2a55b98b90b6bef2e44f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line
    ADD CONSTRAINT "FK_239cfca2a55b98b90b6bef2e44f" FOREIGN KEY ("orderId") REFERENCES public."order"(id) ON DELETE CASCADE;


--
-- TOC entry 4265 (class 2606 OID 32897)
-- Name: product_channels_channel FK_26d12be3b5fec6c4adb1d792844; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_channels_channel
    ADD CONSTRAINT "FK_26d12be3b5fec6c4adb1d792844" FOREIGN KEY ("productId") REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4227 (class 2606 OID 32902)
-- Name: facet_channels_channel FK_2a8ea404d05bf682516184db7d3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_channels_channel
    ADD CONSTRAINT "FK_2a8ea404d05bf682516184db7d3" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4256 (class 2606 OID 32907)
-- Name: order_promotions_promotion FK_2c26b988769c0e3b0120bdef31b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_promotions_promotion
    ADD CONSTRAINT "FK_2c26b988769c0e3b0120bdef31b" FOREIGN KEY ("promotionId") REFERENCES public.promotion(id);


--
-- TOC entry 4251 (class 2606 OID 32912)
-- Name: order_line_reference FK_30019aa65b17fe9ee9628931991; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_reference
    ADD CONSTRAINT "FK_30019aa65b17fe9ee9628931991" FOREIGN KEY ("refundId") REFERENCES public.refund(id);


--
-- TOC entry 4305 (class 2606 OID 32917)
-- Name: stock_location_channels_channel FK_39513fd02a573c848d23bee587d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_location_channels_channel
    ADD CONSTRAINT "FK_39513fd02a573c848d23bee587d" FOREIGN KEY ("stockLocationId") REFERENCES public.stock_location(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4234 (class 2606 OID 32922)
-- Name: history_entry FK_3a05127e67435b4d2332ded7c9e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_entry
    ADD CONSTRAINT "FK_3a05127e67435b4d2332ded7c9e" FOREIGN KEY ("orderId") REFERENCES public."order"(id) ON DELETE CASCADE;


--
-- TOC entry 4295 (class 2606 OID 32927)
-- Name: session FK_3d2f174ef04fb312fdebd0ddc53; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- TOC entry 4233 (class 2606 OID 32932)
-- Name: facet_value_translation FK_3d6e45823b65de808a66cb1423b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_value_translation
    ADD CONSTRAINT "FK_3d6e45823b65de808a66cb1423b" FOREIGN KEY ("baseId") REFERENCES public.facet_value(id) ON DELETE CASCADE;


--
-- TOC entry 4222 (class 2606 OID 32937)
-- Name: customer FK_3f62b42ed23958b120c235f74df; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT "FK_3f62b42ed23958b120c235f74df" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- TOC entry 4286 (class 2606 OID 32942)
-- Name: product_variant_translation FK_420f4d6fb75d38b9dca79bc43b4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_translation
    ADD CONSTRAINT "FK_420f4d6fb75d38b9dca79bc43b4" FOREIGN KEY ("baseId") REFERENCES public.product_variant(id) ON DELETE CASCADE;


--
-- TOC entry 4211 (class 2606 OID 32947)
-- Name: collection FK_4257b61275144db89fa0f5dc059; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection
    ADD CONSTRAINT "FK_4257b61275144db89fa0f5dc059" FOREIGN KEY ("parentId") REFERENCES public.collection(id);


--
-- TOC entry 4317 (class 2606 OID 32952)
-- Name: zone_members_region FK_433f45158e4e2b2a2f344714b22; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_members_region
    ADD CONSTRAINT "FK_433f45158e4e2b2a2f344714b22" FOREIGN KEY ("zoneId") REFERENCES public.zone(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4235 (class 2606 OID 32957)
-- Name: history_entry FK_43ac602f839847fdb91101f30ec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_entry
    ADD CONSTRAINT "FK_43ac602f839847fdb91101f30ec" FOREIGN KEY ("customerId") REFERENCES public.customer(id) ON DELETE CASCADE;


--
-- TOC entry 4217 (class 2606 OID 32962)
-- Name: collection_closure FK_457784c710f8ac9396010441f6c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_closure
    ADD CONSTRAINT "FK_457784c710f8ac9396010441f6c" FOREIGN KEY (id_descendant) REFERENCES public.collection(id) ON DELETE CASCADE;


--
-- TOC entry 4241 (class 2606 OID 32967)
-- Name: order_fulfillments_fulfillment FK_4add5a5796e1582dec2877b2898; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillments_fulfillment
    ADD CONSTRAINT "FK_4add5a5796e1582dec2877b2898" FOREIGN KEY ("fulfillmentId") REFERENCES public.fulfillment(id);


--
-- TOC entry 4315 (class 2606 OID 32972)
-- Name: user_roles_role FK_4be2f7adf862634f5f803d246b8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles_role
    ADD CONSTRAINT "FK_4be2f7adf862634f5f803d246b8" FOREIGN KEY ("roleId") REFERENCES public.role(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4214 (class 2606 OID 32977)
-- Name: collection_asset FK_51da53b26522dc0525762d2de8e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_asset
    ADD CONSTRAINT "FK_51da53b26522dc0525762d2de8e" FOREIGN KEY ("assetId") REFERENCES public.asset(id) ON DELETE CASCADE;


--
-- TOC entry 4283 (class 2606 OID 32982)
-- Name: product_variant_options_product_option FK_526f0131260eec308a3bd2b61b6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_options_product_option
    ADD CONSTRAINT "FK_526f0131260eec308a3bd2b61b6" FOREIGN KEY ("productVariantId") REFERENCES public.product_variant(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4264 (class 2606 OID 32987)
-- Name: product_asset FK_5888ac17b317b93378494a10620; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_asset
    ADD CONSTRAINT "FK_5888ac17b317b93378494a10620" FOREIGN KEY ("assetId") REFERENCES public.asset(id) ON DELETE CASCADE;


--
-- TOC entry 4259 (class 2606 OID 32992)
-- Name: payment_method_channels_channel FK_5bcb569635ce5407eb3f264487d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_method_channels_channel
    ADD CONSTRAINT "FK_5bcb569635ce5407eb3f264487d" FOREIGN KEY ("paymentMethodId") REFERENCES public.payment_method(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4316 (class 2606 OID 32997)
-- Name: user_roles_role FK_5f9286e6c25594c6b88c108db77; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles_role
    ADD CONSTRAINT "FK_5f9286e6c25594c6b88c108db77" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4261 (class 2606 OID 33002)
-- Name: payment_method_translation FK_66187f782a3e71b9e0f5b50b68b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_method_translation
    ADD CONSTRAINT "FK_66187f782a3e71b9e0f5b50b68b" FOREIGN KEY ("baseId") REFERENCES public.payment_method(id) ON DELETE CASCADE;


--
-- TOC entry 4257 (class 2606 OID 33007)
-- Name: order_promotions_promotion FK_67be0e40122ab30a62a9817efe0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_promotions_promotion
    ADD CONSTRAINT "FK_67be0e40122ab30a62a9817efe0" FOREIGN KEY ("orderId") REFERENCES public."order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4244 (class 2606 OID 33012)
-- Name: order_line FK_6901d8715f5ebadd764466f7bde; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line
    ADD CONSTRAINT "FK_6901d8715f5ebadd764466f7bde" FOREIGN KEY ("sellerChannelId") REFERENCES public.channel(id) ON DELETE SET NULL;


--
-- TOC entry 4282 (class 2606 OID 33017)
-- Name: product_variant_facet_values_facet_value FK_69567bc225b6bbbd732d6c5455b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_facet_values_facet_value
    ADD CONSTRAINT "FK_69567bc225b6bbbd732d6c5455b" FOREIGN KEY ("productVariantId") REFERENCES public.product_variant(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4268 (class 2606 OID 33022)
-- Name: product_facet_values_facet_value FK_6a0558e650d75ae639ff38e413a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_facet_values_facet_value
    ADD CONSTRAINT "FK_6a0558e650d75ae639ff38e413a" FOREIGN KEY ("productId") REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4288 (class 2606 OID 33027)
-- Name: promotion_channels_channel FK_6d9e2c39ab12391aaa374bcdaa4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotion_channels_channel
    ADD CONSTRAINT "FK_6d9e2c39ab12391aaa374bcdaa4" FOREIGN KEY ("promotionId") REFERENCES public.promotion(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4275 (class 2606 OID 33032)
-- Name: product_variant FK_6e420052844edf3a5506d863ce6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT "FK_6e420052844edf3a5506d863ce6" FOREIGN KEY ("productId") REFERENCES public.product(id);


--
-- TOC entry 4219 (class 2606 OID 33037)
-- Name: collection_product_variants_product_variant FK_6faa7b72422d9c4679e2f186ad1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_product_variants_product_variant
    ADD CONSTRAINT "FK_6faa7b72422d9c4679e2f186ad1" FOREIGN KEY ("collectionId") REFERENCES public.collection(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4215 (class 2606 OID 33042)
-- Name: collection_channels_channel FK_7216ab24077cf5cbece7857dbbd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_channels_channel
    ADD CONSTRAINT "FK_7216ab24077cf5cbece7857dbbd" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4212 (class 2606 OID 33047)
-- Name: collection FK_7256fef1bb42f1b38156b7449f5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection
    ADD CONSTRAINT "FK_7256fef1bb42f1b38156b7449f5" FOREIGN KEY ("featuredAssetId") REFERENCES public.asset(id) ON DELETE SET NULL;


--
-- TOC entry 4238 (class 2606 OID 33052)
-- Name: order FK_73a78d7df09541ac5eba620d181; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."order"
    ADD CONSTRAINT "FK_73a78d7df09541ac5eba620d181" FOREIGN KEY ("aggregateOrderId") REFERENCES public."order"(id);


--
-- TOC entry 4245 (class 2606 OID 33057)
-- Name: order_line FK_77be94ce9ec6504466179462275; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line
    ADD CONSTRAINT "FK_77be94ce9ec6504466179462275" FOREIGN KEY ("taxCategoryId") REFERENCES public.tax_category(id);


--
-- TOC entry 4296 (class 2606 OID 33062)
-- Name: session FK_7a75399a4f4ffa48ee02e98c059; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "FK_7a75399a4f4ffa48ee02e98c059" FOREIGN KEY ("activeOrderId") REFERENCES public."order"(id);


--
-- TOC entry 4252 (class 2606 OID 33067)
-- Name: order_line_reference FK_7d57857922dfc7303604697dbe9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_reference
    ADD CONSTRAINT "FK_7d57857922dfc7303604697dbe9" FOREIGN KEY ("orderLineId") REFERENCES public.order_line(id) ON DELETE CASCADE;


--
-- TOC entry 4273 (class 2606 OID 33072)
-- Name: product_translation FK_7dbc75cb4e8b002620c4dbfdac5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_translation
    ADD CONSTRAINT "FK_7dbc75cb4e8b002620c4dbfdac5" FOREIGN KEY ("baseId") REFERENCES public.product(id);


--
-- TOC entry 4312 (class 2606 OID 33077)
-- Name: tax_rate FK_7ee3306d7638aa85ca90d672198; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rate
    ADD CONSTRAINT "FK_7ee3306d7638aa85ca90d672198" FOREIGN KEY ("categoryId") REFERENCES public.tax_category(id);


--
-- TOC entry 4302 (class 2606 OID 33082)
-- Name: shipping_method_translation FK_85ec26c71067ebc84adcd98d1a5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method_translation
    ADD CONSTRAINT "FK_85ec26c71067ebc84adcd98d1a5" FOREIGN KEY ("baseId") REFERENCES public.shipping_method(id) ON DELETE CASCADE;


--
-- TOC entry 4225 (class 2606 OID 33087)
-- Name: customer_groups_customer_group FK_85feea3f0e5e82133605f78db02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_groups_customer_group
    ADD CONSTRAINT "FK_85feea3f0e5e82133605f78db02" FOREIGN KEY ("customerGroupId") REFERENCES public.customer_group(id);


--
-- TOC entry 4313 (class 2606 OID 33092)
-- Name: tax_rate FK_8b5ab52fc8887c1a769b9276caf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rate
    ADD CONSTRAINT "FK_8b5ab52fc8887c1a769b9276caf" FOREIGN KEY ("customerGroupId") REFERENCES public.customer_group(id);


--
-- TOC entry 4262 (class 2606 OID 33097)
-- Name: product FK_91a19e6613534949a4ce6e76ff8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT "FK_91a19e6613534949a4ce6e76ff8" FOREIGN KEY ("featuredAssetId") REFERENCES public.asset(id) ON DELETE SET NULL;


--
-- TOC entry 4236 (class 2606 OID 33102)
-- Name: history_entry FK_92f8c334ef06275f9586fd01832; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history_entry
    ADD CONSTRAINT "FK_92f8c334ef06275f9586fd01832" FOREIGN KEY ("administratorId") REFERENCES public.administrator(id);


--
-- TOC entry 4271 (class 2606 OID 33107)
-- Name: product_option_group_translation FK_93751abc1451972c02e033b766c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_group_translation
    ADD CONSTRAINT "FK_93751abc1451972c02e033b766c" FOREIGN KEY ("baseId") REFERENCES public.product_option_group(id) ON DELETE CASCADE;


--
-- TOC entry 4303 (class 2606 OID 33112)
-- Name: stock_level FK_984c48572468c69661a0b7b0494; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_level
    ADD CONSTRAINT "FK_984c48572468c69661a0b7b0494" FOREIGN KEY ("stockLocationId") REFERENCES public.stock_location(id) ON DELETE CASCADE;


--
-- TOC entry 4314 (class 2606 OID 33117)
-- Name: tax_rate FK_9872fc7de2f4e532fd3230d1915; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rate
    ADD CONSTRAINT "FK_9872fc7de2f4e532fd3230d1915" FOREIGN KEY ("zoneId") REFERENCES public.zone(id);


--
-- TOC entry 4304 (class 2606 OID 33122)
-- Name: stock_level FK_9950eae3180f39c71978748bd08; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_level
    ADD CONSTRAINT "FK_9950eae3180f39c71978748bd08" FOREIGN KEY ("productVariantId") REFERENCES public.product_variant(id) ON DELETE CASCADE;


--
-- TOC entry 4205 (class 2606 OID 33127)
-- Name: asset_tags_tag FK_9e412b00d4c6cee1a4b3d920716; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_tags_tag
    ADD CONSTRAINT "FK_9e412b00d4c6cee1a4b3d920716" FOREIGN KEY ("assetId") REFERENCES public.asset(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4246 (class 2606 OID 33132)
-- Name: order_line FK_9f065453910ea77d4be8e92618f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line
    ADD CONSTRAINT "FK_9f065453910ea77d4be8e92618f" FOREIGN KEY ("featuredAssetId") REFERENCES public.asset(id) ON DELETE SET NULL;


--
-- TOC entry 4307 (class 2606 OID 33137)
-- Name: stock_movement FK_a2fe7172eeae9f1cca86f8f573a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movement
    ADD CONSTRAINT "FK_a2fe7172eeae9f1cca86f8f573a" FOREIGN KEY ("stockLocationId") REFERENCES public.stock_location(id) ON DELETE CASCADE;


--
-- TOC entry 4311 (class 2606 OID 33142)
-- Name: surcharge FK_a49c5271c39cc8174a0535c8088; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.surcharge
    ADD CONSTRAINT "FK_a49c5271c39cc8174a0535c8088" FOREIGN KEY ("orderModificationId") REFERENCES public.order_modification(id);


--
-- TOC entry 4266 (class 2606 OID 33147)
-- Name: product_channels_channel FK_a51dfbd87c330c075c39832b6e7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_channels_channel
    ADD CONSTRAINT "FK_a51dfbd87c330c075c39832b6e7" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4269 (class 2606 OID 33152)
-- Name: product_option FK_a6debf9198e2fbfa006aa10d710; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option
    ADD CONSTRAINT "FK_a6debf9198e2fbfa006aa10d710" FOREIGN KEY ("groupId") REFERENCES public.product_option_group(id);


--
-- TOC entry 4270 (class 2606 OID 33157)
-- Name: product_option_group FK_a6e91739227bf4d442f23c52c75; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_group
    ADD CONSTRAINT "FK_a6e91739227bf4d442f23c52c75" FOREIGN KEY ("productId") REFERENCES public.product(id);


--
-- TOC entry 4272 (class 2606 OID 33162)
-- Name: product_option_translation FK_a79a443c1f7841f3851767faa6d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_option_translation
    ADD CONSTRAINT "FK_a79a443c1f7841f3851767faa6d" FOREIGN KEY ("baseId") REFERENCES public.product_option(id) ON DELETE CASCADE;


--
-- TOC entry 4223 (class 2606 OID 33167)
-- Name: customer_channels_channel FK_a842c9fe8cd4c8ff31402d172d7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_channels_channel
    ADD CONSTRAINT "FK_a842c9fe8cd4c8ff31402d172d7" FOREIGN KEY ("customerId") REFERENCES public.customer(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4254 (class 2606 OID 33172)
-- Name: order_modification FK_ad2991fa2933ed8b7f86a716338; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_modification
    ADD CONSTRAINT "FK_ad2991fa2933ed8b7f86a716338" FOREIGN KEY ("paymentId") REFERENCES public.payment(id);


--
-- TOC entry 4231 (class 2606 OID 33177)
-- Name: facet_value_channels_channel FK_ad690c1b05596d7f52e52ffeedd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_value_channels_channel
    ADD CONSTRAINT "FK_ad690c1b05596d7f52e52ffeedd" FOREIGN KEY ("facetValueId") REFERENCES public.facet_value(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4208 (class 2606 OID 33182)
-- Name: channel FK_af2116c7e176b6b88dceceeb74b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT "FK_af2116c7e176b6b88dceceeb74b" FOREIGN KEY ("sellerId") REFERENCES public.seller(id);


--
-- TOC entry 4209 (class 2606 OID 33187)
-- Name: channel FK_afe9f917a1c82b9e9e69f7c6129; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT "FK_afe9f917a1c82b9e9e69f7c6129" FOREIGN KEY ("defaultTaxZoneId") REFERENCES public.zone(id);


--
-- TOC entry 4318 (class 2606 OID 33192)
-- Name: zone_members_region FK_b45b65256486a15a104e17d495c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_members_region
    ADD CONSTRAINT "FK_b45b65256486a15a104e17d495c" FOREIGN KEY ("regionId") REFERENCES public.region(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4226 (class 2606 OID 33197)
-- Name: customer_groups_customer_group FK_b823a3c8bf3b78d3ed68736485c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_groups_customer_group
    ADD CONSTRAINT "FK_b823a3c8bf3b78d3ed68736485c" FOREIGN KEY ("customerId") REFERENCES public.customer(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4279 (class 2606 OID 33202)
-- Name: product_variant_channels_channel FK_beeb2b3cd800e589f2213ae99d6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_channels_channel
    ADD CONSTRAINT "FK_beeb2b3cd800e589f2213ae99d6" FOREIGN KEY ("productVariantId") REFERENCES public.product_variant(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4293 (class 2606 OID 33207)
-- Name: role_channels_channel FK_bfd2a03e9988eda6a9d11760119; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_channels_channel
    ADD CONSTRAINT "FK_bfd2a03e9988eda6a9d11760119" FOREIGN KEY ("roleId") REFERENCES public.role(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4260 (class 2606 OID 33212)
-- Name: payment_method_channels_channel FK_c00e36f667d35031087b382e61b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_method_channels_channel
    ADD CONSTRAINT "FK_c00e36f667d35031087b382e61b" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4218 (class 2606 OID 33217)
-- Name: collection_closure FK_c309f8cd152bbeaea08491e0c66; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_closure
    ADD CONSTRAINT "FK_c309f8cd152bbeaea08491e0c66" FOREIGN KEY (id_ancestor) REFERENCES public.collection(id) ON DELETE CASCADE;


--
-- TOC entry 4210 (class 2606 OID 33222)
-- Name: channel FK_c9ca2f58d4517460435cbd8b4c9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel
    ADD CONSTRAINT "FK_c9ca2f58d4517460435cbd8b4c9" FOREIGN KEY ("defaultShippingZoneId") REFERENCES public.zone(id);


--
-- TOC entry 4298 (class 2606 OID 33227)
-- Name: shipping_line FK_c9f34a440d490d1b66f6829b86c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_line
    ADD CONSTRAINT "FK_c9f34a440d490d1b66f6829b86c" FOREIGN KEY ("orderId") REFERENCES public."order"(id) ON DELETE CASCADE;


--
-- TOC entry 4228 (class 2606 OID 33232)
-- Name: facet_channels_channel FK_ca796020c6d097e251e5d6d2b02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_channels_channel
    ADD CONSTRAINT "FK_ca796020c6d097e251e5d6d2b02" FOREIGN KEY ("facetId") REFERENCES public.facet(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4255 (class 2606 OID 33237)
-- Name: order_modification FK_cb66b63b6e97613013795eadbd5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_modification
    ADD CONSTRAINT "FK_cb66b63b6e97613013795eadbd5" FOREIGN KEY ("refundId") REFERENCES public.refund(id);


--
-- TOC entry 4247 (class 2606 OID 33242)
-- Name: order_line FK_cbcd22193eda94668e84d33f185; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line
    ADD CONSTRAINT "FK_cbcd22193eda94668e84d33f185" FOREIGN KEY ("productVariantId") REFERENCES public.product_variant(id) ON DELETE CASCADE;


--
-- TOC entry 4216 (class 2606 OID 33247)
-- Name: collection_channels_channel FK_cdbf33ffb5d4519161251520083; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_channels_channel
    ADD CONSTRAINT "FK_cdbf33ffb5d4519161251520083" FOREIGN KEY ("collectionId") REFERENCES public.collection(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4258 (class 2606 OID 33252)
-- Name: payment FK_d09d285fe1645cd2f0db811e293; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT "FK_d09d285fe1645cd2f0db811e293" FOREIGN KEY ("orderId") REFERENCES public."order"(id);


--
-- TOC entry 4240 (class 2606 OID 33257)
-- Name: order_channels_channel FK_d0d16db872499e83b15999f8c7a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_channels_channel
    ADD CONSTRAINT "FK_d0d16db872499e83b15999f8c7a" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4230 (class 2606 OID 33262)
-- Name: facet_value FK_d101dc2265a7341be3d94968c5b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_value
    ADD CONSTRAINT "FK_d101dc2265a7341be3d94968c5b" FOREIGN KEY ("facetId") REFERENCES public.facet(id) ON DELETE CASCADE;


--
-- TOC entry 4280 (class 2606 OID 33267)
-- Name: product_variant_channels_channel FK_d194bff171b62357688a5d0f559; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_channels_channel
    ADD CONSTRAINT "FK_d194bff171b62357688a5d0f559" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4308 (class 2606 OID 33272)
-- Name: stock_movement FK_d2c8d5fca981cc820131f81aa83; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movement
    ADD CONSTRAINT "FK_d2c8d5fca981cc820131f81aa83" FOREIGN KEY ("orderLineId") REFERENCES public.order_line(id);


--
-- TOC entry 4200 (class 2606 OID 33277)
-- Name: address FK_d87215343c3a3a67e6a0b7f3ea9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT "FK_d87215343c3a3a67e6a0b7f3ea9" FOREIGN KEY ("countryId") REFERENCES public.region(id);


--
-- TOC entry 4201 (class 2606 OID 33282)
-- Name: address FK_dc34d382b493ade1f70e834c4d3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT "FK_dc34d382b493ade1f70e834c4d3" FOREIGN KEY ("customerId") REFERENCES public.customer(id);


--
-- TOC entry 4204 (class 2606 OID 33287)
-- Name: asset_channels_channel FK_dc4e7435f9f5e9e6436bebd33bb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_channels_channel
    ADD CONSTRAINT "FK_dc4e7435f9f5e9e6436bebd33bb" FOREIGN KEY ("assetId") REFERENCES public.asset(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4248 (class 2606 OID 33292)
-- Name: order_line FK_dc9ac68b47da7b62249886affba; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line
    ADD CONSTRAINT "FK_dc9ac68b47da7b62249886affba" FOREIGN KEY ("shippingLineId") REFERENCES public.shipping_line(id) ON DELETE SET NULL;


--
-- TOC entry 4224 (class 2606 OID 33297)
-- Name: customer_channels_channel FK_dc9f69207a8867f83b0fd257e30; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_channels_channel
    ADD CONSTRAINT "FK_dc9f69207a8867f83b0fd257e30" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4294 (class 2606 OID 33302)
-- Name: role_channels_channel FK_e09dfee62b158307404202b43a5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_channels_channel
    ADD CONSTRAINT "FK_e09dfee62b158307404202b43a5" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4232 (class 2606 OID 33307)
-- Name: facet_value_channels_channel FK_e1d54c0b9db3e2eb17faaf5919c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_value_channels_channel
    ADD CONSTRAINT "FK_e1d54c0b9db3e2eb17faaf5919c" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4299 (class 2606 OID 33312)
-- Name: shipping_line FK_e2e7642e1e88167c1dfc827fdf3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_line
    ADD CONSTRAINT "FK_e2e7642e1e88167c1dfc827fdf3" FOREIGN KEY ("shippingMethodId") REFERENCES public.shipping_method(id);


--
-- TOC entry 4221 (class 2606 OID 33317)
-- Name: collection_translation FK_e329f9036210d75caa1d8f2154a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_translation
    ADD CONSTRAINT "FK_e329f9036210d75caa1d8f2154a" FOREIGN KEY ("baseId") REFERENCES public.collection(id) ON DELETE CASCADE;


--
-- TOC entry 4276 (class 2606 OID 33322)
-- Name: product_variant FK_e38dca0d82fd64c7cf8aac8b8ef; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT "FK_e38dca0d82fd64c7cf8aac8b8ef" FOREIGN KEY ("taxCategoryId") REFERENCES public.tax_category(id);


--
-- TOC entry 4285 (class 2606 OID 33327)
-- Name: product_variant_price FK_e6126cd268aea6e9b31d89af9ab; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_price
    ADD CONSTRAINT "FK_e6126cd268aea6e9b31d89af9ab" FOREIGN KEY ("variantId") REFERENCES public.product_variant(id) ON DELETE CASCADE;


--
-- TOC entry 4309 (class 2606 OID 33332)
-- Name: stock_movement FK_e65ba3882557cab4febb54809bb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movement
    ADD CONSTRAINT "FK_e65ba3882557cab4febb54809bb" FOREIGN KEY ("productVariantId") REFERENCES public.product_variant(id);


--
-- TOC entry 4284 (class 2606 OID 33337)
-- Name: product_variant_options_product_option FK_e96a71affe63c97f7fa2f076dac; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_options_product_option
    ADD CONSTRAINT "FK_e96a71affe63c97f7fa2f076dac" FOREIGN KEY ("productOptionId") REFERENCES public.product_option(id);


--
-- TOC entry 4229 (class 2606 OID 33342)
-- Name: facet_translation FK_eaea53f44bf9e97790d38a3d68f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facet_translation
    ADD CONSTRAINT "FK_eaea53f44bf9e97790d38a3d68f" FOREIGN KEY ("baseId") REFERENCES public.facet(id) ON DELETE CASCADE;


--
-- TOC entry 4297 (class 2606 OID 33347)
-- Name: session FK_eb87ef1e234444728138302263b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "FK_eb87ef1e234444728138302263b" FOREIGN KEY ("activeChannelId") REFERENCES public.channel(id);


--
-- TOC entry 4291 (class 2606 OID 33352)
-- Name: region FK_ed0c8098ce6809925a437f42aec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT "FK_ed0c8098ce6809925a437f42aec" FOREIGN KEY ("parentId") REFERENCES public.region(id) ON DELETE SET NULL;


--
-- TOC entry 4300 (class 2606 OID 33357)
-- Name: shipping_method_channels_channel FK_f0a17b94aa5a162f0d422920eb2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method_channels_channel
    ADD CONSTRAINT "FK_f0a17b94aa5a162f0d422920eb2" FOREIGN KEY ("shippingMethodId") REFERENCES public.shipping_method(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4301 (class 2606 OID 33362)
-- Name: shipping_method_channels_channel FK_f2b98dfb56685147bed509acc3d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method_channels_channel
    ADD CONSTRAINT "FK_f2b98dfb56685147bed509acc3d" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


--
-- TOC entry 4242 (class 2606 OID 33367)
-- Name: order_fulfillments_fulfillment FK_f80d84d525af2ffe974e7e8ca29; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillments_fulfillment
    ADD CONSTRAINT "FK_f80d84d525af2ffe974e7e8ca29" FOREIGN KEY ("orderId") REFERENCES public."order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4278 (class 2606 OID 33372)
-- Name: product_variant_asset FK_fa21412afac15a2304f3eb35feb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant_asset
    ADD CONSTRAINT "FK_fa21412afac15a2304f3eb35feb" FOREIGN KEY ("productVariantId") REFERENCES public.product_variant(id) ON DELETE CASCADE;


--
-- TOC entry 4220 (class 2606 OID 33377)
-- Name: collection_product_variants_product_variant FK_fb05887e2867365f236d7dd95ee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_product_variants_product_variant
    ADD CONSTRAINT "FK_fb05887e2867365f236d7dd95ee" FOREIGN KEY ("productVariantId") REFERENCES public.product_variant(id);


--
-- TOC entry 4206 (class 2606 OID 33382)
-- Name: asset_tags_tag FK_fb5e800171ffbe9823f2cc727fd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_tags_tag
    ADD CONSTRAINT "FK_fb5e800171ffbe9823f2cc727fd" FOREIGN KEY ("tagId") REFERENCES public.tag(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4306 (class 2606 OID 33387)
-- Name: stock_location_channels_channel FK_ff8150fe54e56a900d5712671a0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_location_channels_channel
    ADD CONSTRAINT "FK_ff8150fe54e56a900d5712671a0" FOREIGN KEY ("channelId") REFERENCES public.channel(id) ON DELETE CASCADE;


-- Completed on 2025-07-22 16:01:54 UTC

--
-- PostgreSQL database dump complete
--

