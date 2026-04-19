import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ description: 'Error code for identifying the type of error' })
  code!: string;

  @ApiProperty({ description: 'Human-readable error message' })
  message!: string;

  @ApiProperty({ description: 'Additional error details', required: false })
  details?: any;
}

export class ResponseMetaDto {
  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: string;

  @ApiProperty({ description: 'Request ID for tracking', required: false })
  requestId?: string;
}

export class ApiResponseDto<T = any> {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Response data', required: false })
  data?: T;

  @ApiProperty({ description: 'Error information', required: false })
  error?: ApiErrorDto;

  @ApiProperty({ description: 'Response metadata', required: false })
  meta?: ResponseMetaDto;
}