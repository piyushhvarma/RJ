import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { SearchCustomersDto } from './dto/search-customers.dto.js';
import { UpdateCustomerPhotoDto } from './dto/update-customer-photo.dto.js';
import { AddCustomerDocumentDto } from './dto/add-customer-document.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  // Staff can register customers (§7.5); every other role that can also do
  // it is included so managers/owners aren't blocked from the same action.
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.customersService.create(dto, user);
  }

  @Post(':id/photo')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  updatePhoto(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerPhotoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.updatePhoto(id, dto.photoUrl, user);
  }

  @Post(':id/documents')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  addDocument(
    @Param('id') id: string,
    @Body() dto: AddCustomerDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.addDocument(id, dto, user);
  }

  @Get()
  search(@Query() query: SearchCustomersDto) {
    return this.customersService.search(query.q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findById(id);
  }
}
