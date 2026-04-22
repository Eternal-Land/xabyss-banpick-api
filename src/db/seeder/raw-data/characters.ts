import { CharacterEntity } from "@db/entities";
import { CharacterElement, WeaponType } from "@utils/enums";
import { DeepPartial } from "typeorm";

export const rawChars: DeepPartial<CharacterEntity>[] = [
	{
		key: "albedo",
		name: "Albedo",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868770/Albedo_qn2dhr.png",
		rarity: 5,
		element: CharacterElement.GEO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "alhaitham",
		name: "Alhaitham",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868770/Alhaitham_o3tk3m.png",
		rarity: 5,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "aloy",
		name: "Aloy",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868770/Aloy_ndk6rw.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "arlecchino",
		name: "Arlecchino",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868771/Arlecchino_jxyass.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "kamisato_ayaka",
		name: "Kamisato Ayaka",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868863/Kamisato_Ayaka_dndjm1.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "kamisato_ayato",
		name: "Kamisato Ayato",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868885/Kamisato_Ayato_ehuili.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "baizhu",
		name: "Baizhu",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868771/Baizhu_jvttqr.png",
		rarity: 5,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "chasca",
		name: "Chasca",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868783/Chasca_sqxnly.png",
		rarity: 5,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "childe",
		name: "Childe",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869002/Tartaglia_wziglh.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "chiori",
		name: "Chiori",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868784/Chiori_nwdhyr.png",
		rarity: 5,
		element: CharacterElement.GEO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "citlali",
		name: "Citlali",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868791/Citlali_aeximg.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "clorinde",
		name: "Clorinde",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868791/Clorinde_ibbsjo.png",
		rarity: 5,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "columbina",
		name: "Columbina",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868793/Columbina_b88fw2.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "cyno",
		name: "Cyno",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868801/Cyno_gopb9u.png",
		rarity: 5,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "dehya",
		name: "Dehya",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868802/Dehya_xbsnwm.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "diluc",
		name: "Diluc",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868803/Diluc_avq4wb.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "durin",
		name: "Durin",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868813/Durin_f5jz8k.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "emilie",
		name: "Emilie",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868821/Emilie_agr1bu.png",
		rarity: 5,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "escoffier",
		name: "Escoffier",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868821/Escoffier_qhkahd.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "eula",
		name: "Eula",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868822/Eula_p6x9sb.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "flins",
		name: "Flins",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868833/Flins_tjjtaq.png",
		rarity: 5,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "furina",
		name: "Furina",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868833/Flins_tjjtaq.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "ganyu",
		name: "Ganyu",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868848/Ganyu_uw3dng.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "hu_tao",
		name: "Hu Tao",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868850/Hu_Tao_c5efbr.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "ineffa",
		name: "Ineffa",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868861/Ineffa_lapluz.png",
		rarity: 5,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "ataraki_itto",
		name: "Ataraki Itto",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868771/Arataki_Itto_qzcl1r.png",
		rarity: 5,
		element: CharacterElement.GEO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "jean",
		name: "Jean",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868862/Jean_g59lk1.png",
		rarity: 5,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "kaedehara_kazuha",
		name: "Kaedehara Kazuha",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868862/Kaedehara_Kazuha_j6wfci.png",
		rarity: 5,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "keqing",
		name: "Keqing",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868884/Keqing_nuu9zg.png",
		rarity: 5,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "kinich",
		name: "Kinich",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868884/Kinich_xrtlrn.png",
		rarity: 5,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "klee",
		name: "Klee",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868897/Klee_cf6ll8.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "sangonomiya_kokomi",
		name: "Sangonomiya Kokomi",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868973/Sangonomiya_Kokomi_pnph9x.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "lauma",
		name: "Lauma",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868899/Lauma_vwhxvo.png",
		rarity: 5,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "linnae",
		name: "Linnae",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1768877305/linnae_eblqjz.png",
		rarity: 5,
		element: CharacterElement.GEO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "lyney",
		name: "Lyney",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868919/Lyney_bmwsku.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "mavuika",
		name: "Mavuika",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868924/Mavuika_kfs78d.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "mona",
		name: "Mona",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868931/Mona_ftjfoi.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "mualani",
		name: "Mualani",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868932/Mualani_cdqfnn.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "nahida",
		name: "Nahida",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868934/Nahida_x3zjue.png",
		rarity: 5,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "navia",
		name: "Navia",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868941/Navia_fydgbm.png",
		rarity: 5,
		element: CharacterElement.GEO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "nefer",
		name: "Nefer",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868942/Nefer_pnhfl9.png",
		rarity: 5,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "neuvillette",
		name: "Neuvillette",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868949/Neuvillette_rxhbgu.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "nilou",
		name: "Nilou",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868950/Nilou_gnoimr.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "qiqi",
		name: "Qiqi",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868962/Qiqi_li1wtp.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "raiden_shogun",
		name: "Raiden Shogun",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868963/Raiden_Shogun_a9ffwb.png",
		rarity: 5,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "shenhe",
		name: "Shenhe",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868985/Shenhe_x3sfkq.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "sigewinne",
		name: "Sigewinne",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868993/Sigewinne_xlrbei.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "skirk",
		name: "Skirk",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868993/Skirk_xhs0to.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "tighnari",
		name: "Tighnari",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869004/Tighnari_rwn7ul.png",
		rarity: 5,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "traveller_anemo",
		name: "Traveller Anemo",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868910/Lumine_tpns8m.png",
		rarity: 5,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "traveller_geo",
		name: "Traveller Geo",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868910/Lumine_tpns8m.png",
		rarity: 5,
		element: CharacterElement.GEO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "traveller_electro",
		name: "Traveller Electro",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868910/Lumine_tpns8m.png",
		rarity: 5,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "traveller_dendro",
		name: "Traveller Dendro",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868910/Lumine_tpns8m.png",
		rarity: 5,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "traveller_hydro",
		name: "Traveller Hydro",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868910/Lumine_tpns8m.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "traveller_pyro",
		name: "Traveller Pyro",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868910/Lumine_tpns8m.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "varesa",
		name: "Varesa",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869004/Varesa_lppkrz.png",
		rarity: 5,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "venti",
		name: "Venti",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869010/Venti_q8ybvm.png",
		rarity: 5,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "wanderer",
		name: "Wanderer",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869012/Wanderer_mnhmc6.png",
		rarity: 5,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "wriothesley",
		name: "Wriothesley",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869016/Wriothesley_bhw1ug.png",
		rarity: 5,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "xianyun",
		name: "Xianyun",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869025/Xianyun_conasb.png",
		rarity: 5,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "xiao",
		name: "Xiao",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869026/Xiao_dllexg.png",
		rarity: 5,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "xilonen",
		name: "Xilonen",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869026/Xilonen_dzglyn.png",
		rarity: 5,
		element: CharacterElement.GEO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "yae_miko",
		name: "Yae Miko",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869040/Yae_Miko_vvezhm.png",
		rarity: 5,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "yelan",
		name: "Yelan",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869052/Yelan_drxmmt.png",
		rarity: 5,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "yoimiya",
		name: "Yoimiya",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869053/Yoimiya_eyhpbb.png",
		rarity: 5,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "yumemizuki_mizuki",
		name: "Yumemizuki Mizuki",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869054/Yumemizuki_Mizuki_ostjam.png",
		rarity: 5,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "zhongli",
		name: "Zhongli",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869063/Zhongli_r8klkw.png",
		rarity: 5,
		element: CharacterElement.GEO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "zibai",
		name: "Zibai",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869064/Zibai_fzyptq.png",
		rarity: 5,
		element: CharacterElement.GEO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "aino",
		name: "Aino",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868775/Aino_ibmusk.png",
		rarity: 4,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "amber",
		name: "Amber",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868770/Amber_ysemyo.png",
		rarity: 4,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "barbara",
		name: "Barbara",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868771/Barbara_ztecy2.png",
		rarity: 4,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "beidou",
		name: "Beidou",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868771/Beidou_ljeszq.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "bennett",
		name: "Bennett",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868778/Bennett_gzs3zm.png",
		rarity: 4,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "candace",
		name: "Candace",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868777/Candace_monz0a.png",
		rarity: 4,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "charlotte",
		name: "Charlotte",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868779/Charlotte_me5yrp.png",
		rarity: 4,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "chevreuse",
		name: "Chevreuse",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868784/Chevreuse_q9oalj.png",
		rarity: 4,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "chongyun",
		name: "Chongyun",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868785/Chongyun_uzys7l.png",
		rarity: 4,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "collei",
		name: "Collei",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868792/Collei_qwbmph.png",
		rarity: 4,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "dahlia",
		name: "Dahlia",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868802/Dahia_avfxu1.png",
		rarity: 4,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "diona",
		name: "Diona",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868812/Diona_idvhqf.png",
		rarity: 4,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "dori",
		name: "Dori",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868812/Dori_jbtxsg.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "faruzan",
		name: "Faruzan",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868822/Faruzan_t451ie.png",
		rarity: 4,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "fischl",
		name: "Fischl",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868832/Fischl_cci5gz.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "freminet",
		name: "Freminet",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868833/Freminet_vmyni8.png",
		rarity: 4,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "gaming",
		name: "Gaming",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868848/Gaming_ueluwz.png",
		rarity: 4,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "gorou",
		name: "Gorou",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868848/Gorou_q4znj1.png",
		rarity: 4,
		element: CharacterElement.GEO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "shikanoin_heizou",
		name: "Shikanoin Heizou",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868992/Shikanoin_Heizou_oobivk.png",
		rarity: 4,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "iansan",
		name: "Iansan",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868865/Iansan_q0sz9j.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "ifa",
		name: "Ifa",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868861/Ifa_o0bbz4.png",
		rarity: 4,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "illuga",
		name: "Illuga",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868861/Illuga_p8v6ax.png",
		rarity: 4,
		element: CharacterElement.GEO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "jahoda",
		name: "Jahoda",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868862/Jahoda_qi9v8w.png",
		rarity: 4,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "kachina",
		name: "Kachina",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868862/Kachina_rgu2ks.png",
		rarity: 4,
		element: CharacterElement.GEO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "kaeya",
		name: "Kaeya",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868862/Kaeya_yzvnai.png",
		rarity: 4,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "kaveh",
		name: "Kaveh",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868883/Kaveh_dqe0b6.png",
		rarity: 4,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "kirara",
		name: "Kirara",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868888/Kirara_wmqmgj.png",
		rarity: 4,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "kuki_shinobu",
		name: "Kuki Shinobu",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868898/Kuki_Shinobu_o4hibc.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "lan_yan",
		name: "Lan Yan",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868898/Lan_Yan_y4hcy3.png",
		rarity: 4,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "layla",
		name: "Layla",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868908/Layla_hsc7z5.png",
		rarity: 4,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "lisa",
		name: "Lisa",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868909/Lisa_vdhblk.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "lynette",
		name: "Lynette",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868918/Lynette_bbuuo0.png",
		rarity: 4,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "mika",
		name: "Mika",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868926/Mika_jdmd4c.png",
		rarity: 4,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "ningguang",
		name: "Ningguang",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868957/Ningguang_tzj0bm.png",
		rarity: 4,
		element: CharacterElement.GEO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "noelle",
		name: "Noelle",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868961/Noelle_ihb6jz.png",
		rarity: 4,
		element: CharacterElement.GEO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "ororon",
		name: "Ororon",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868962/Ororon_opxmxf.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "razor",
		name: "Razor",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868972/Razor_zppa0p.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "rosaria",
		name: "Rosaria",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868973/Rosaria_wwzfqt.png",
		rarity: 4,
		element: CharacterElement.CRYO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "kujou_sara",
		name: "Kujou Sara",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868897/Kujou_Sara_p6woka.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "sayu",
		name: "Sayu",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868982/Sayu_g4rjtn.png",
		rarity: 4,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "sethos",
		name: "Sethos",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868983/Sethos_bj1209.png",
		rarity: 4,
		element: CharacterElement.ELECTRO,
		weaponType: WeaponType.BOW,
	},
	{
		key: "sucrose",
		name: "Sucrose",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776868996/Sucrose_hqsvnx.png",
		rarity: 4,
		element: CharacterElement.ANEMO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "thoma",
		name: "Thoma",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869003/Thoma_u5jajl.png",
		rarity: 4,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "xiangling",
		name: "Xiangling",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869017/Xiangling_dbin0l.png",
		rarity: 4,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "xingqiu",
		name: "Xingqiu",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869027/Xingqiu_ef2esx.png",
		rarity: 4,
		element: CharacterElement.HYDRO,
		weaponType: WeaponType.SWORD,
	},
	{
		key: "xinyan",
		name: "Xinyan",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869039/Xinyan_sz6olp.png",
		rarity: 4,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.CLAYMORE,
	},
	{
		key: "yanfei",
		name: "Yanfei",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869047/Yanfei_o7bl9c.png",
		rarity: 4,
		element: CharacterElement.PYRO,
		weaponType: WeaponType.CATALYST,
	},
	{
		key: "yaoyao",
		name: "Yaoyao",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869052/Yaoyao_l2cn1f.png",
		rarity: 4,
		element: CharacterElement.DENDRO,
		weaponType: WeaponType.POLEARM,
	},
	{
		key: "yun_jin",
		name: "Yun Jin",
		iconUrl:
			"https://res.cloudinary.com/dphtvhtvf/image/upload/v1776869063/Yun_Jin_zwta2t.png",
		rarity: 4,
		element: CharacterElement.GEO,
		weaponType: WeaponType.POLEARM,
	},
];
