# AWS Deployment Guide

## Recommended Target

- Frontend: ECS/Fargate service or Amplify hosting
- Backend services: ECS/Fargate
- MongoDB: Atlas or DocumentDB
- Redis: ElastiCache for Redis
- RabbitMQ: Amazon MQ
- Media + static assets: Cloudinary and S3/CloudFront if needed

## Container Images

- `frontend/Dockerfile`
- `services/restaurant/Dockerfile`
- `services/admin/Dockerfile`
- `services/rider/Dockerfile`

Build locally:

```bash
docker compose -f docker-compose.aws.yml build
```

## Environment Strategy

- Replace all localhost frontend env vars with AWS service URLs
- Store secrets in AWS Secrets Manager or SSM Parameter Store
- Keep `REDIS_URL`, `RABBITMQ_URL`, `MONGODB_URI`, payment keys, JWT secret, and internal service key outside the image

## Production Checklist

- Put frontend behind CloudFront or an ALB
- Use HTTPS everywhere
- Restrict internal service routes with `INTERNAL_SERVICE_KEY`
- Attach service logs to CloudWatch
- Provision ElastiCache in the same VPC as the backend services
- Add health checks on each ECS service
- Scale admin and rider horizontally only after confirming shared Redis and RabbitMQ connectivity

## Notes

- Frontend now supports env-based service URLs via `VITE_*_SERVICE_URL`
- Redis caching is graceful: if Redis is down, APIs continue serving DB-backed responses
- Restaurant BI analytics, admin analytics, and rider queue/order caching are all safe to run without Redis, just slower
