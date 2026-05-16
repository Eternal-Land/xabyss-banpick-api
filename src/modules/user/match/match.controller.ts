import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import {
	BaseApiResponse,
	PaginationDto,
	SkipAuth,
	SwaggerBaseApiMessageResponse,
	SwaggerBaseApiResponse,
} from "@utils";
import {
	CreateMatchRequest,
	ContinueSessionRequest,
	MatchQuery,
	MatchResponse,
	MatchStateResponse,
	TurnActionRequest,
} from "./dto";
import { MatchService } from "./match.service";
import { CompleteSessionRequest } from "./dto/complete-session.request";

@Controller("/user/match")
export class MatchController {
	constructor(private readonly matchService: MatchService) {}

	@Post()
	@SwaggerBaseApiResponse(MatchResponse)
	@ApiBearerAuth()
	async createOne(@Body() dto: CreateMatchRequest) {
		const match = await this.matchService.createOne(dto);
		return BaseApiResponse.success(MatchResponse.fromEntity(match));
	}

	@Get()
	@SwaggerBaseApiResponse(MatchResponse, {
		isArray: true,
		withPagination: true,
	})
	@SkipAuth()
	async findMany(@Query() query: MatchQuery) {
		const { items, total } = await this.matchService.findMany(query);
		return BaseApiResponse.successWithPagination(
			MatchResponse.fromEntities(items),
			PaginationDto.from(query.page, query.take, total),
		);
	}

	@Get(":id/state")
	@SwaggerBaseApiResponse(MatchStateResponse)
	@SkipAuth()
	async getMatchState(@Param("id", ParseUUIDPipe) id: string) {
		const matchState = await this.matchService.getMatchState(id);
		return BaseApiResponse.success(matchState);
	}

	@Get(":id")
	@SwaggerBaseApiResponse(MatchResponse)
	@ApiBearerAuth()
	async findOne(@Param("id", ParseUUIDPipe) id: string) {
		const match = await this.matchService.findOne(id);
		return BaseApiResponse.success(MatchResponse.fromEntity(match));
	}

	@Delete(":id")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async deleteOne(@Param("id", ParseUUIDPipe) id: string) {
		await this.matchService.deleteOne(id);
		return BaseApiResponse.success();
	}

	@Put(":id/start")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async startMatch(@Param("id", ParseUUIDPipe) id: string) {
		await this.matchService.startMatch(id);
		return BaseApiResponse.success();
	}

	@Post(":id/complete-session")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async completeSession(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: CompleteSessionRequest,
	) {
		await this.matchService.completeCurrentSession(id, dto?.winnerSide);
		return BaseApiResponse.success();
	}

	@Post(":id/continue-session")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async continueSession(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: ContinueSessionRequest,
	) {
		await this.matchService.continueCurrentSession(id, dto);
		return BaseApiResponse.success();
	}

	@Put(":id/pick-char/:charId")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async pickChar(
		@Param("id", ParseUUIDPipe) id: string,
		@Param("charId", ParseIntPipe) charId: number,
		@Body() dto: TurnActionRequest,
	) {
		await this.matchService.pickChar(id, charId, dto?.clientActionAt);
		return BaseApiResponse.success();
	}

	@Put(":id/ban-char/:charId")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async banChar(
		@Param("id", ParseUUIDPipe) id: string,
		@Param("charId", ParseIntPipe) charId: number,
		@Body() dto: TurnActionRequest,
	) {
		await this.matchService.banChar(id, charId, dto?.clientActionAt);
		return BaseApiResponse.success();
	}

	@Put(":id/pick-weapon/:charId/:weaponId/:weaponRefinement")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async pickWeapon(
		@Param("id", ParseUUIDPipe) id: string,
		@Param("charId", ParseIntPipe) charId: number,
		@Param("weaponId") weaponId: string,
		@Param("weaponRefinement", ParseIntPipe) weaponRefinement: number,
	) {
		await this.matchService.pickWeapon(id, charId, weaponId, weaponRefinement);
		return BaseApiResponse.success();
	}

	@Put(":id/activate-supachai/:fromCharId/:toCharId")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async activateSupachai(
		@Param("id", ParseUUIDPipe) id: string,
		@Param("fromCharId", ParseIntPipe) fromCharId: number,
		@Param("toCharId", ParseIntPipe) toCharId: number,
	) {
		await this.matchService.activateSupachai(id, fromCharId, toCharId);
		return BaseApiResponse.success();
	}

	@Put(":id/pause")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async pauseMatch(@Param("id", ParseUUIDPipe) id: string) {
		const hostId = this.matchService["cls"].get("profile.id");
		await this.matchService.pauseMatch(id, hostId);
		return BaseApiResponse.success();
	}

	@Put(":id/resume")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async resumeMatch(@Param("id", ParseUUIDPipe) id: string) {
		const hostId = this.matchService["cls"].get("profile.id");
		await this.matchService.resumeMatch(id, hostId);
		return BaseApiResponse.success();
	}

	@Put(":id/undo")
	@SwaggerBaseApiMessageResponse()
	@ApiBearerAuth()
	async undoLastAction(@Param("id", ParseUUIDPipe) id: string) {
		const hostId = this.matchService["cls"].get("profile.id");
		await this.matchService.undoLastAction(id, hostId);
		return BaseApiResponse.success();
	}
}
